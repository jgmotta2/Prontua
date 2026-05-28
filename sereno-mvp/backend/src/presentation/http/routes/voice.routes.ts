import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { join } from 'path';
import { mkdirSync } from 'fs';
import rateLimit from 'express-rate-limit';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import {
  reportParamsSchema,
  sessionReportParamsSchema,
  updateReportBodySchema,
} from '@presentation/http/schemas/voice.schema';
import { uploadAudioUseCase } from '@application/use-cases/voice/upload-audio.use-case';
import {
  getReportUseCase,
  getReportBySessionUseCase,
} from '@application/use-cases/voice/get-report.use-case';
import { updateReportUseCase } from '@application/use-cases/voice/update-report.use-case';
import {
  finalizeReportUseCase,
  getPdfBufferUseCase,
} from '@application/use-cases/voice/finalize-report.use-case';
import { AppError } from '@shared/errors/app-error';
import { env } from '@config/env';

const router = Router();

// ── Proteção de autenticação em todas as rotas ──────────────────────────────
router.use(authRequired(), tenantContext(), requireClinicalAccess);

// ── Rate limiter específico para upload de áudio (anti Denial-of-Wallet) ───
// Máx. 2 uploads por minuto por profissional (user ID como chave).
const audioUploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_AUDIO_PER_MIN,
  keyGenerator: (req) => (req as any).auth?.sub ?? (req as any).ip,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'AUDIO_RATE_LIMITED',
        message: `Máximo de ${env.RATE_LIMIT_AUDIO_PER_MIN} uploads por minuto. Aguarde antes de gravar novamente.`,
      },
    });
  },
});

// ── Multer — recebimento do áudio no disco (deleção efêmera posterior) ─────
const uploadDir = join(process.cwd(), 'storage', 'tmp-audio');
mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`),
  }),
  limits: {
    fileSize: 100 * 1024 * 1024,    // 100 MB — trava no upload, antes do Whisper
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    if (ALLOWED_MIME_TYPES.has(mime)) {
      cb(null, true);
    } else {
      cb(new AppError('INVALID_FILE_TYPE', 'Formato de áudio não permitido. Use WebM ou MP3.', 415) as any);
    }
  },
});

// ── POST /voice/sessions/:sessionId/upload ──────────────────────────────────
// Recebe o áudio, transcreve, estrutura e retorna o relatório em rascunho.
router.post(
  '/sessions/:sessionId/upload',
  audioUploadRateLimiter,
  validate({ params: sessionReportParamsSchema }),
  upload.single('audio'),
  audit('VOICE_UPLOAD', (req) => ({
    resourceType: 'VoiceSessionReport',
    resourceId: req.params['sessionId'] as string,
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('MISSING_FILE', 'Arquivo de áudio não enviado.', 400);
      }

      const sessionId = req.params['sessionId'] as string;
      const specialty = (req.auth as any)?.specialty ?? 'OUTRA';

      const result = await uploadAudioUseCase(req.db!, {
        sessionId,
        authorId: req.auth!.sub,
        tempFilePath: req.file.path,
        mimeType: req.file.mimetype,
        specialty,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /voice/sessions/:sessionId/report ───────────────────────────────────
// Busca o relatório de voz de uma sessão.
router.get(
  '/sessions/:sessionId/report',
  validate({ params: sessionReportParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await getReportBySessionUseCase(req.db!, req.params['sessionId'] as string);
      if (!report) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Nenhum prontuário de voz para esta sessão.' },
        });
      }
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /voice/reports/:reportId ────────────────────────────────────────────
router.get(
  '/reports/:reportId',
  validate({ params: reportParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await getReportUseCase(req.db!, req.params['reportId'] as string);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /voice/reports/:reportId ──────────────────────────────────────────
// Atualiza o markdown antes da finalização.
router.patch(
  '/reports/:reportId',
  validate({ params: reportParamsSchema, body: updateReportBodySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await updateReportUseCase(req.db!, {
        reportId: req.params['reportId'] as string,
        structuredReport: req.body.structuredReport,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /voice/reports/:reportId/finalize ───────────────────────────────────
// Finaliza o prontuário, gera o PDF e trava o registro.
router.post(
  '/reports/:reportId/finalize',
  validate({ params: reportParamsSchema }),
  audit('VOICE_REPORT_FINALIZE', (req) => ({
    resourceType: 'VoiceSessionReport',
    resourceId: req.params['reportId'] as string,
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = req.params['reportId'] as string;
      const result = await finalizeReportUseCase(req.db!, {
        reportId,
        authorId: req.auth!.sub,
      });

      // Retorna o PDF diretamente no response para download imediato
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="prontuario-${result.reportId}.pdf"`,
      );
      res.setHeader('Content-Length', result.pdfBuffer.byteLength);
      res.end(result.pdfBuffer);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /voice/reports/:reportId/pdf ────────────────────────────────────────
// Download do PDF já gerado (para prontuários finalizados anteriormente).
router.get(
  '/reports/:reportId/pdf',
  validate({ params: reportParamsSchema }),
  audit('VOICE_PDF_DOWNLOAD', (req) => ({
    resourceType: 'VoiceSessionReport',
    resourceId: req.params['reportId'] as string,
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportId = req.params['reportId'] as string;
      const { buffer, patientName } = await getPdfBufferUseCase(req.db!, reportId);

      const safePatientName = patientName.replace(/[^a-zA-Z0-9À-ɏ ]/g, '').trim().replace(/\s+/g, '-');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="prontuario-${safePatientName}-${reportId.slice(0, 8)}.pdf"`,
      );
      res.setHeader('Content-Length', buffer.byteLength);
      res.end(buffer);
    } catch (err) {
      next(err);
    }
  },
);

export { router as voiceRoutes };
