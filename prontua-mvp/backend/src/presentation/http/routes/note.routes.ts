import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { encryptionService } from '@infrastructure/crypto/encryption.service';
import { NotFoundError } from '@shared/errors/app-error';

const router = Router();
router.use(authRequired(), tenantContext(), requireClinicalAccess);

const sessionIdParam = z.object({ sessionId: z.string().uuid() }).strict();
const patientIdParam = z.object({ patientId: z.string().uuid() }).strict();

const noteBodySchema = z.object({
  technique: z.enum(['TCC','ACT','EMDR','DBT','PSICANALISE','GESTALT','SISTEMICA','OUTRA']).nullable().optional(),
  humor: z.number().int().min(1).max(5).nullable().optional(),
  evolutionNote: z.string().max(20000).optional(),
  nextSteps: z.string().max(10000).optional(),
}).strict();

function decryptNote(note: { contentEnc: string; contentIv: string; contentTag: string; keyVersion: number }) {
  const raw = encryptionService.decrypt({
    ciphertext: note.contentEnc,
    iv: note.contentIv,
    tag: note.contentTag,
    keyVersion: note.keyVersion,
  });
  return JSON.parse(raw) as { technique?: string | null; humor?: number | null; evolutionNote?: string; nextSteps?: string };
}

// GET /notes/patients/:patientId — lista sessões com resumo + status de pagamento
router.get(
  '/patients/:patientId',
  validate({ params: patientIdParam }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = req.params['patientId'] as string;

      const sessions = await req.db!.session.findMany({
        where: { patientId, deletedAt: null },
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true,
          scheduledAt: true,
          durationMin: true,
          mode: true,
          value: true,
          status: true,
          payment: { select: { status: true } },
          note: {
            select: { id: true, contentEnc: true, contentIv: true, contentTag: true, keyVersion: true },
          },
        },
      });

      const result = sessions.map((s) => {
        let technique: string | null = null;
        let humor: number | null = null;
        let hasNote = false;
        if (s.note) {
          hasNote = true;
          try {
            const parsed = decryptNote(s.note as any);
            technique = parsed.technique ?? null;
            humor = parsed.humor ?? null;
          } catch { /* integridade comprometida */ }
        }
        return {
          id: s.id,
          scheduledAt: s.scheduledAt,
          durationMin: s.durationMin,
          mode: s.mode,
          value: Number(s.value),
          status: s.status,
          paymentStatus: s.payment?.status ?? null,
          hasNote,
          technique,
          humor,
        };
      });

      res.json({ sessions: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /notes/patients/:patientId/export — todas as notas completas (PDF completo)
router.get(
  '/patients/:patientId/export',
  validate({ params: patientIdParam }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = req.params['patientId'] as string;

      const sessions = await req.db!.session.findMany({
        where: { patientId, deletedAt: null, note: { isNot: null } },
        orderBy: { scheduledAt: 'asc' },
        select: {
          id: true,
          scheduledAt: true,
          durationMin: true,
          mode: true,
          value: true,
          status: true,
          note: {
            select: { contentEnc: true, contentIv: true, contentTag: true, keyVersion: true },
          },
        },
      });

      const result = sessions.map((s) => {
        let humor: number | null = null;
        let evolutionNote = '';
        let nextSteps = '';
        if (s.note) {
          try {
            const parsed = decryptNote(s.note as any);
            humor = parsed.humor ?? null;
            evolutionNote = parsed.evolutionNote ?? '';
            nextSteps = parsed.nextSteps ?? '';
          } catch { /* ignore */ }
        }
        return {
          id: s.id,
          scheduledAt: s.scheduledAt,
          durationMin: s.durationMin,
          mode: s.mode,
          value: Number(s.value),
          status: s.status,
          humor,
          evolutionNote,
          nextSteps,
        };
      });

      res.json({ sessions: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /notes/sessions/:sessionId — nota completa da sessão
router.get(
  '/sessions/:sessionId',
  validate({ params: sessionIdParam }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params['sessionId'] as string;

      const session = await req.db!.session.findUnique({
        where: { id: sessionId, deletedAt: null },
        select: {
          id: true,
          scheduledAt: true,
          durationMin: true,
          mode: true,
          value: true,
          status: true,
          patientId: true,
          payment: { select: { status: true } },
          note: {
            select: { id: true, contentEnc: true, contentIv: true, contentTag: true, keyVersion: true },
          },
        },
      });

      if (!session) throw new NotFoundError('Sessão');

      let technique: string | null = null;
      let humor: number | null = null;
      let evolutionNote = '';
      let nextSteps = '';

      if (session.note) {
        try {
          const parsed = decryptNote(session.note as any);
          technique = parsed.technique ?? null;
          humor = parsed.humor ?? null;
          evolutionNote = parsed.evolutionNote ?? '';
          nextSteps = parsed.nextSteps ?? '';
        } catch { /* ignore */ }
      }

      res.json({
        sessionId: session.id,
        scheduledAt: session.scheduledAt,
        durationMin: session.durationMin,
        mode: session.mode,
        value: Number(session.value),
        status: session.status,
        patientId: session.patientId,
        paymentStatus: session.payment?.status ?? null,
        technique,
        humor,
        evolutionNote,
        nextSteps,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /notes/sessions/:sessionId — cria ou atualiza nota
router.put(
  '/sessions/:sessionId',
  validate({ params: sessionIdParam, body: noteBodySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params['sessionId'] as string;
      const body = req.body as { technique?: string | null; humor?: number | null; evolutionNote?: string; nextSteps?: string };

      const session = await req.db!.session.findUnique({
        where: { id: sessionId },
        select: { id: true },
      });
      if (!session) throw new NotFoundError('Sessão');

      const content = JSON.stringify({
        technique: body.technique ?? null,
        humor: body.humor ?? null,
        evolutionNote: body.evolutionNote ?? '',
        nextSteps: body.nextSteps ?? '',
      });
      const enc = encryptionService.encrypt(content);

      const existing = await req.db!.sessionNote.findFirst({
        where: { sessionId } as any,
        select: { id: true },
      });

      if (existing) {
        await req.db!.sessionNote.update({
          where: { id: existing.id } as any,
          data: { contentEnc: enc.ciphertext, contentIv: enc.iv, contentTag: enc.tag, keyVersion: enc.keyVersion },
        });
      } else {
        await req.db!.sessionNote.create({
          data: {
            sessionId,
            authorId: req.auth!.sub,
            contentEnc: enc.ciphertext,
            contentIv: enc.iv,
            contentTag: enc.tag,
            keyVersion: enc.keyVersion,
          } as any,
        });
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { router as noteRoutes };
