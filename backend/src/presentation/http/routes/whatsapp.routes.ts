import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireSubscription } from '@presentation/http/middlewares/subscription.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';
import { audit } from '@presentation/http/middlewares/audit.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { sensitiveRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { notifySessionUseCase }     from '@application/use-cases/whatsapp/notify-session.use-case';
import { notifyPaymentDueUseCase }  from '@application/use-cases/whatsapp/notify-payment-due.use-case';
import type { SessionNotificationType } from '@application/use-cases/whatsapp/notify-session.use-case';

const sessionNotifyParams = z.object({ sessionId: z.string().uuid() }).strict();
const paymentNotifyParams = z.object({ paymentId: z.string().uuid() }).strict();
const sessionNotifyBody   = z
  .object({ type: z.enum(['SCHEDULE_CONFIRM', 'REMINDER_24H']) })
  .strict();

const router = Router();

router.use(authRequired(), requireSubscription(), tenantContext(), requireClinicalAccess);

// POST /whatsapp/notify/session/:sessionId
// body: { type: "SCHEDULE_CONFIRM" | "REMINDER_24H" }
router.post(
  '/notify/session/:sessionId',
  sensitiveRateLimiter,
  validate({ params: sessionNotifyParams, body: sessionNotifyBody }),
  audit('WHATSAPP_SEND', (req) => ({ resourceType: 'Session', resourceId: req.params['sessionId'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notifySessionUseCase(
        req.db!,
        req.params['sessionId'] as string,
        req.auth!.tenantId,
        (req.body as any).type as SessionNotificationType,
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /whatsapp/notify/payment/:paymentId
router.post(
  '/notify/payment/:paymentId',
  sensitiveRateLimiter,
  validate({ params: paymentNotifyParams }),
  audit('WHATSAPP_SEND', (req) => ({ resourceType: 'Payment', resourceId: req.params['paymentId'] as string })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notifyPaymentDueUseCase(
        req.db!,
        req.params['paymentId'] as string,
        req.auth!.tenantId,
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export { router as whatsappRoutes };
