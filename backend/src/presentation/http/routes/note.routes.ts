import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireSubscription } from '@presentation/http/middlewares/subscription.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { sensitiveRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import {
  upsertSessionNoteSchema,
  sessionNoteParamsSchema,
  patientIdForNotesParams,
} from '@presentation/http/schemas/clinical.schema';
import type { Request, Response, NextFunction } from 'express';

import { getSessionNoteUseCase }     from '@application/use-cases/notes/get-session-note.use-case';
import { upsertSessionNoteUseCase }  from '@application/use-cases/notes/upsert-session-note.use-case';
import { getPatientTimelineUseCase } from '@application/use-cases/notes/get-patient-timeline.use-case';
import { exportPatientPdfUseCase }   from '@application/use-cases/notes/export-patient-pdf.use-case';
import { shareProntuarioUseCase }    from '@application/use-cases/notes/share-prontuario.use-case';

const router = Router();

// All clinical note routes require PROFESSIONAL+ access
router.use(authRequired(), requireSubscription(), tenantContext(), requireClinicalAccess);

// GET /notes/session/:sessionId
router.get(
  '/session/:sessionId',
  validate({ params: sessionNoteParamsSchema }),
  audit('NOTE_VIEW', (req) => ({ resourceType: 'SessionNote', resourceId: req.params['sessionId'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const note = await getSessionNoteUseCase(req.db!, req.params['sessionId'] as string);
      res.json(note);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /notes/session/:sessionId  (upsert)
router.put(
  '/session/:sessionId',
  validate({ params: sessionNoteParamsSchema, body: upsertSessionNoteSchema }),
  audit('NOTE_CREATE', (req) => ({ resourceType: 'SessionNote', resourceId: req.params['sessionId'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await upsertSessionNoteUseCase(
        req.db!,
        req.params['sessionId'] as string,
        req.body as any,
        req.auth!.sub,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /notes/patient/:patientId  —  full session timeline (decrypted)
router.get(
  '/patient/:patientId',
  validate({ params: patientIdForNotesParams }),
  audit('NOTE_VIEW', (req) => ({ resourceType: 'Patient', resourceId: req.params['patientId'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getPatientTimelineUseCase(req.db!, req.params['patientId'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /notes/export/patient/:patientId  —  stream clinical PDF
router.get(
  '/export/patient/:patientId',
  sensitiveRateLimiter,
  validate({ params: patientIdForNotesParams }),
  audit('EXPORT_REQUEST', (req) => ({ resourceType: 'Patient', resourceId: req.params['patientId'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pdfBuffer, safeName } = await exportPatientPdfUseCase(
        req.db!,
        req.params['patientId'] as string,
        req.auth!.tenantId,
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="prontuario_${safeName}.pdf"`);
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.setHeader('Cache-Control', 'no-store');
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  },
);

// POST /notes/share/patient/:patientId  —  send PDF via Z-API WhatsApp
router.post(
  '/share/patient/:patientId',
  sensitiveRateLimiter,
  validate({ params: patientIdForNotesParams }),
  audit('WHATSAPP_SEND', (req) => ({ resourceType: 'Patient', resourceId: req.params['patientId'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shareProntuarioUseCase(
        req.db!,
        req.params['patientId'] as string,
        req.auth!.tenantId,
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export { router as noteRoutes };
