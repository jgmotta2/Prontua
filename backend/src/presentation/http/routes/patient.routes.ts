import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireSubscription } from '@presentation/http/middlewares/subscription.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { sensitiveRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import {
  createPatientSchema,
  updatePatientSchema,
  patientIdParams,
} from '@presentation/http/schemas/clinical.schema';
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@shared/errors/app-error';
import { hashDocument } from '@infrastructure/security/hash.util';
import { encryptionService } from '@infrastructure/crypto/encryption.service';

const router = Router();

router.use(authRequired(), requireSubscription(), tenantContext(), requireClinicalAccess);

// GET /patients
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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
});

// GET /patients/:id
router.get(
  '/:id',
  validate({ params: patientIdParams }),
  audit('PATIENT_VIEW', (req) => ({ resourceType: 'Patient', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await req.db!.patient.findUnique({
        where: { id: req.params['id'] as string, deletedAt: null },
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

      const docFields = body.document
        ? (() => {
            const enc = encryptionService.encrypt(body.document as string);
            return {
              documentEnc: enc.ciphertext,
              documentIv: enc.iv,
              documentTag: enc.tag,
              documentHash: hashDocument(body.document as string),
            };
          })()
        : {};

      const ccFields = body.chiefComplaint
        ? (() => {
            const enc = encryptionService.encrypt(body.chiefComplaint as string);
            return {
              chiefComplaintEnc: enc.ciphertext,
              chiefComplaintIv:  enc.iv,
              chiefComplaintTag: enc.tag,
              chiefComplaintKv:  enc.keyVersion ?? 1,
            };
          })()
        : {};

      const patient = await req.db!.patient.create({
        data: {
          fullName:     body.fullName,
          city:         body.city,
          birthDate:    body.birthDate,
          email:        body.email,
          whatsapp:     body.whatsapp,
          notesGeneral: body.notesGeneral,
          tags:         body.tags,
          sessionValue: body.sessionValue,
          frequencyTag: body.frequencyTag,
          ...docFields,
          ...ccFields,
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
  validate({ params: patientIdParams, body: updatePatientSchema }),
  audit('PATIENT_UPDATE', (req) => ({ resourceType: 'Patient', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'] as string;
      const body = req.body as any;

      const docFields = body.document
        ? (() => {
            const enc = encryptionService.encrypt(body.document as string);
            return {
              documentEnc: enc.ciphertext,
              documentIv: enc.iv,
              documentTag: enc.tag,
              documentHash: hashDocument(body.document as string),
            };
          })()
        : {};

      const ccPatchFields = body.chiefComplaint
        ? (() => {
            const enc = encryptionService.encrypt(body.chiefComplaint as string);
            return {
              chiefComplaintEnc: enc.ciphertext,
              chiefComplaintIv:  enc.iv,
              chiefComplaintTag: enc.tag,
              chiefComplaintKv:  enc.keyVersion ?? 1,
            };
          })()
        : {};

      const { document: _doc, chiefComplaint: _cc, ...rest } = body;

      const patient = await req.db!.patient.update({
        where: { id },
        data: { ...rest, ...docFields, ...ccPatchFields } as any,
      });

      res.json(patient);
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
      await req.db!.patient.delete({ where: { id: req.params['id'] as string } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { router as patientRoutes };
