import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireSubscription } from '@presentation/http/middlewares/subscription.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import {
  paymentIdParams,
  updatePaymentSchema,
} from '@presentation/http/schemas/clinical.schema';
import type { Request, Response, NextFunction } from 'express';

import { listPaymentsUseCase }      from '@application/use-cases/payments/list-payments.use-case';
import { getFinanceSummaryUseCase } from '@application/use-cases/payments/get-finance-summary.use-case';
import { updatePaymentUseCase }     from '@application/use-cases/payments/update-payment.use-case';

const router = Router();

// Financial data is visible to any authenticated role in the clinic
router.use(authRequired(), requireSubscription(), tenantContext());

// GET /finance/payments  —  query: status, month (YYYY-MM)
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const result = await listPaymentsUseCase(req.db!, {
      status: q['status'] as any,
      month:  q['month'],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /finance/summary  —  query: month (YYYY-MM, defaults to current)
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const result = await getFinanceSummaryUseCase(req.db!, { month: q['month'] });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /finance/payments/:id
router.patch(
  '/payments/:id',
  validate({ params: paymentIdParams, body: updatePaymentSchema }),
  audit('PAYMENT_UPDATE', (req) => ({ resourceType: 'Payment', resourceId: req.params['id'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await updatePaymentUseCase(
        req.db!,
        req.params['id'] as string,
        req.body as any,
      );
      res.json(payment);
    } catch (err) {
      next(err);
    }
  },
);

export { router as financeRoutes };
