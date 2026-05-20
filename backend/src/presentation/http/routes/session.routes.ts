import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import {
  createSessionSchema,
  updateSessionStatusSchema,
  sessionIdParams,
} from '@presentation/http/schemas/clinical.schema';
import type { Request, Response, NextFunction } from 'express';

import { listSessionsUseCase }        from '@application/use-cases/sessions/list-sessions.use-case';
import { getSessionUseCase }          from '@application/use-cases/sessions/get-session.use-case';
import { createSessionUseCase }       from '@application/use-cases/sessions/create-session.use-case';
import { updateSessionStatusUseCase } from '@application/use-cases/sessions/update-session-status.use-case';

const router = Router();

// List is accessible to any authenticated role (assistants manage agenda).
// Create/update requires PROFESSIONAL+.
router.use(authRequired(), tenantContext());

// GET /sessions  —  query: date, from, to, patientId, status
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const result = await listSessionsUseCase(req.db!, {
      date:      q['date'],
      from:      q['from'],
      to:        q['to'],
      patientId: q['patientId'],
      status:    q['status'] as any,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /sessions/:id
router.get(
  '/:id',
  validate({ params: sessionIdParams }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await getSessionUseCase(req.db!, req.params['id'] as string);
      res.json(session);
    } catch (err) {
      next(err);
    }
  },
);

// POST /sessions  —  creates session + PENDING payment
router.post(
  '/',
  requireClinicalAccess,
  validate({ body: createSessionSchema }),
  audit('SESSION_CREATE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await createSessionUseCase(req.db!, {
        ...(req.body as any),
        requestingUserId: req.auth!.sub,
      });
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /sessions/:id/status
router.patch(
  '/:id/status',
  requireClinicalAccess,
  validate({ params: sessionIdParams, body: updateSessionStatusSchema }),
  audit('SESSION_UPDATE', (req) => ({ resourceType: 'Session', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await updateSessionStatusUseCase(
        req.db!,
        req.params['id'] as string,
        (req.body as any).status,
      );
      res.json(session);
    } catch (err) {
      next(err);
    }
  },
);

export { router as sessionRoutes };
