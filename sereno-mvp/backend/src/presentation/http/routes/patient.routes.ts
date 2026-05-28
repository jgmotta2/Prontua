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
      // tags is stored as JSON string in SQLite — parse back to array
      const result = patients.map(p => ({
        ...p,
        tags: (() => { try { return JSON.parse(p.tags as string); } catch { return []; } })(),
      }));
      res.json({ patients: result });
    } catch (err) {
      next(err);
    }
  },
);

// GET /patients/:id
router.get(
  '/:id',
  validate({ params: patientIdParams }),
  audit('PATIENT_VIEW', (req) => ({ resourceType: 'Patient', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'] as string;
      const patient = await req.db!.patient.findUnique({
        where: { id, deletedAt: null },
        // Nunca retornar campos de criptografia ao cliente.
        // documentEnc/documentIv/documentTag são dados sensíveis que só
        // o servidor deve tocar — o cliente não tem como descriptografar.
        select: {
          id: true,
          fullName: true,
          birthDate: true,
          email: true,
          whatsapp: true,
          notesGeneral: true,
          tags: true,
          sessionValue: true,
          frequencyTag: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          // documentHash exposto apenas para verificação de integridade (não revela o CPF)
          documentHash: true,
        },
      });
      if (!patient) throw new NotFoundError('Paciente');
      // Parse tags (stored as JSON string in SQLite)
      res.json({
        ...patient,
        tags: (() => { try { return JSON.parse(patient.tags as string); } catch { return []; } })(),
      });
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
          tags: JSON.stringify(body.tags ?? []),
          sessionValue: body.sessionValue,
          frequencyTag: body.frequencyTag,
          ...docFields,
        } as any,
      });

      res.status(201).json({ ...patient, tags: body.tags ?? [] });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /patients/:id
router.patch(
  '/:id',
  validate({ params: patientIdParams }),
  audit('PATIENT_UPDATE', (req) => ({ resourceType: 'Patient', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'] as string;
      const patient = await req.db!.patient.findUnique({
        where: { id, deletedAt: null },
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
        where: { id },
        data: {
          ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.whatsapp !== undefined ? { whatsapp: body.whatsapp } : {}),
          ...(body.birthDate !== undefined ? { birthDate: new Date(body.birthDate) } : {}),
          ...(body.sessionValue !== undefined ? { sessionValue: body.sessionValue } : {}),
          ...(body.frequencyTag !== undefined ? { frequencyTag: body.frequencyTag } : {}),
          ...(body.notesGeneral !== undefined ? { notesGeneral: body.notesGeneral } : {}),
          ...(body.tags !== undefined ? { tags: JSON.stringify(body.tags) } : {}),
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
  audit('PATIENT_DELETE', (req) => ({ resourceType: 'Patient', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'] as string;
      // Deleta em ordem para respeitar as restrições de FK:
      // 1. Pagamentos do paciente (Payment.patientId → Restrict)
      // 2. Sessões do paciente (Session.patientId → Restrict)
      //    SessionNote e VoiceSessionReport cascadeiam ao deletar a sessão
      // 3. Paciente (PatientConsent cascadeia automaticamente)
      await req.db!.payment.deleteMany({ where: { patientId: id } });
      await req.db!.session.deleteMany({ where: { patientId: id } });
      await req.db!.patient.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { router as patientRoutes };
