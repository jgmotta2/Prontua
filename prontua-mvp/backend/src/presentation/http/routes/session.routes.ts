import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import {
  createSessionSchema,
  updateSessionStatusSchema,
} from '@presentation/http/schemas/clinical.schema';
import { createSessionUseCase } from '@application/use-cases/session/create-session.use-case';
import { listSessionsUseCase } from '@application/use-cases/session/list-sessions.use-case';
import { NotFoundError } from '@shared/errors/app-error';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

router.use(authRequired(), tenantContext(), requireClinicalAccess);

const sessionIdParams = z.object({ id: z.string().uuid() }).strict();

const listSessionsQuery = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).strict();

// GET /sessions?from=&to=
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listSessionsQuery.safeParse(req.query);
      const now = new Date();
      const from = parsed.success ? parsed.data.from : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const to = parsed.success ? parsed.data.to : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const sessions = await listSessionsUseCase(req.db!, { from, to });
      res.json({ sessions });
    } catch (err) {
      next(err);
    }
  },
);

// POST /sessions
router.post(
  '/',
  validate({ body: createSessionSchema }),
  audit('SESSION_CREATE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as any;
      // professionalId padrão: o próprio usuário autenticado
      const input = { ...body, professionalId: body.professionalId ?? req.auth!.sub };
      const result = await createSessionUseCase(req.db!, input);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /sessions/:id/status
router.patch(
  '/:id/status',
  validate({ params: sessionIdParams, body: updateSessionStatusSchema }),
  audit('SESSION_UPDATE', (req) => ({ resourceType: 'Session', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'] as string;

      const session = await req.db!.session.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!session) throw new NotFoundError('Sessão');

      const updated = await req.db!.session.update({
        where: { id },
        data: { status: req.body.status },
        select: { id: true, status: true },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /sessions/:id
router.delete(
  '/:id',
  validate({ params: sessionIdParams }),
  audit('SESSION_DELETE', (req) => ({ resourceType: 'Session', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'] as string;

      const session = await req.db!.session.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!session) throw new NotFoundError('Sessão');

      // Cascade: remove pagamento vinculado antes de excluir sessão
      await req.db!.payment.deleteMany({ where: { sessionId: id } });
      await req.db!.session.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { router as sessionRoutes };
