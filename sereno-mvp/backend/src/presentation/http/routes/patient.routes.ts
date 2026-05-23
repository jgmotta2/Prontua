import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { sensitiveRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import {
  createPatientSchema,
  patientIdParams,
} from '@presentation/http/schemas/clinical.schema';
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@shared/errors/app-error';
import { hashDocument } from '@infrastructure/security/hash.util';
import { encryptionService } from '@infrastructure/crypto/encryption.service';

const router = Router();

/**
 * Todas as rotas neste router exigem:
 *   1. autenticação (cookie HttpOnly válido)
 *   2. contexto de tenant (req.db isolado)
 *   3. role >= PROFESSIONAL (ASSISTANT bloqueado)
 *
 * Auditoria é registrada por endpoint conforme criticidade.
 */
router.use(authRequired(), tenantContext(), requireClinicalAccess);

// GET /patients
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patients = await req.db!.patient.findMany({
        where: { deletedAt: null },
        orderBy: { fullName: 'asc' },
        select: {
          id: true, fullName: true, whatsapp: true, sessionValue: true,
          frequencyTag: true, tags: true, createdAt: true,
        },
      });
      res.json({ patients });
    } catch (err) {
      next(err);
    }
  },
);

// GET /patients/:id
router.get(
  '/:id',
  validate({ params: patientIdParams }),
  audit('PATIENT_VIEW', (req) => ({ resourceType: 'Patient', resourceId: req.params.id })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await req.db!.patient.findUnique({
        where: { id: req.params.id, deletedAt: null },
      });
      if (!patient) throw new NotFoundError('Paciente');
      res.json(patient);
    } catch (err) {
      next(err);
    }
  },
);

// POST /patients
router.post(
  '/',
  validate({ body: createPatientSchema }),
  audit('PATIENT_CREATE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as any;

      // CPF criptografado + hash determinístico para lookup.
      const docFields = body.document
        ? (() => {
            const enc = encryptionService.encrypt(body.document);
            return {
              documentEnc: enc.ciphertext,
              documentIv: enc.iv,
              documentTag: enc.tag,
              documentHash: hashDocument(body.document),
            };
          })()
        : {};

      const patient = await req.db!.patient.create({
        data: {
          fullName: body.fullName,
          birthDate: body.birthDate,
          email: body.email,
          whatsapp: body.whatsapp,
          notesGeneral: body.notesGeneral,
          tags: body.tags,
          sessionValue: body.sessionValue,
          frequencyTag: body.frequencyTag,
          ...docFields,
        } as any,
      });

      res.status(201).json(patient);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /patients/:id
router.patch(
  '/:id',
  validate({ params: patientIdParams }),
  audit('PATIENT_UPDATE', (req) => ({ resourceType: 'Patient', resourceId: req.params.id })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await req.db!.patient.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: { id: true },
      });
      if (!patient) throw new NotFoundError('Paciente');

      const body = req.body as any;
      const docFields = body.document
        ? (() => {
            const enc = encryptionService.encrypt(body.document);
            return {
              documentEnc: enc.ciphertext,
              documentIv: enc.iv,
              documentTag: enc.tag,
              documentHash: hashDocument(body.document),
            };
          })()
        : {};

      const updated = await req.db!.patient.update({
        where: { id: req.params.id },
        data: {
          ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.whatsapp !== undefined ? { whatsapp: body.whatsapp } : {}),
          ...(body.birthDate !== undefined ? { birthDate: new Date(body.birthDate) } : {}),
          ...(body.sessionValue !== undefined ? { sessionValue: body.sessionValue } : {}),
          ...(body.frequencyTag !== undefined ? { frequencyTag: body.frequencyTag } : {}),
          ...(body.notesGeneral !== undefined ? { notesGeneral: body.notesGeneral } : {}),
          ...(body.tags !== undefined ? { tags: body.tags } : {}),
          ...docFields,
        } as any,
        select: { id: true, fullName: true, sessionValue: true, frequencyTag: true },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /patients/:id  (LGPD: hard delete sob solicitação)
router.delete(
  '/:id',
  sensitiveRateLimiter,
  validate({ params: patientIdParams }),
  audit('PATIENT_DELETE', (req) => ({ resourceType: 'Patient', resourceId: req.params.id })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await req.db!.patient.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { router as patientRoutes };
