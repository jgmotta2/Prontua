import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { listPaymentsUseCase } from '@application/use-cases/finance/list-payments.use-case';
import { NotFoundError } from '@shared/errors/app-error';
import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

router.use(authRequired(), tenantContext(), requireClinicalAccess);

const paymentIdParams = z.object({ id: z.string().uuid() }).strict();

const listPaymentsQuery = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).strict();

const markPaidBody = z.object({
  method: z.nativeEnum(PaymentMethod).optional(),
}).strict();

// GET /finance/payments
router.get(
  '/payments',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listPaymentsQuery.safeParse(req.query);
      const params = parsed.success ? parsed.data : {};
      const payments = await listPaymentsUseCase(req.db!, params);
      res.json({ payments });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /finance/payments/:id/pay
router.patch(
  '/payments/:id/pay',
  validate({ params: paymentIdParams, body: markPaidBody }),
  audit('PAYMENT_UPDATE', (req) => ({ resourceType: 'Payment', resourceId: req.params.id })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await req.db!.payment.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true },
      });
      if (!payment) throw new NotFoundError('Pagamento');

      const updated = await req.db!.payment.update({
        where: { id: req.params.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          ...(req.body.method ? { method: req.body.method } : {}),
        },
        select: { id: true, status: true, paidAt: true, method: true },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export { router as financeRoutes };
