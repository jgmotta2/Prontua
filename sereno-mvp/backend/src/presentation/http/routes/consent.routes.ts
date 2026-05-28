import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { consentParamsSchema } from '@presentation/http/schemas/voice.schema';
import { recordConsentUseCase } from '@application/use-cases/consent/record-consent.use-case';
import { checkConsentUseCase } from '@application/use-cases/consent/check-consent.use-case';

const router = Router();

router.use(authRequired(), tenantContext(), requireClinicalAccess);

/**
 * GET /consent/patients/:patientId
 * Verifica status do consentimento de um paciente.
 * Retorna { hasActiveConsent, termVersion, agreedAt, isCurrentVersion }
 */
router.get(
  '/patients/:patientId',
  validate({ params: consentParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await checkConsentUseCase(req.db!, req.params['patientId'] as string);
      res.json(status);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /consent/patients/:patientId
 * Registra o TCLE de um paciente.
 * Body: vazio (o IP é lido do request, o profissional do JWT).
 */
router.post(
  '/patients/:patientId',
  validate({ params: consentParamsSchema }),
  audit('CONSENT_CREATE', (req) => ({
    resourceType: 'PatientConsent',
    resourceId: req.params['patientId'] as string,
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await recordConsentUseCase(req.db!, {
        patientId: req.params['patientId'] as string,
        professionalId: req.auth!.sub,
        rawIp: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as consentRoutes };
