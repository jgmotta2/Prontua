import { Router, type Request, type Response, type NextFunction } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { billingService } from '@infrastructure/billing/billing.service';
import { billingRateLimiter, webhookRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import { env } from '@config/env';
import { AppError } from '@shared/errors/app-error';
import { prisma } from '@config/prisma';

const router = Router();

// GET /billing/status — retorna trial/subscription info do tenant logado
router.get('/status', authRequired(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await billingService.getStatus(req.auth!.tenantId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// POST /billing/checkout — cria sessão Stripe Checkout e retorna URL
router.post('/checkout', billingRateLimiter, authRequired(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where:  { id: req.auth!.sub },
      select: { email: true },
    });

    const url = await billingService.createCheckoutSession({
      tenantId:   req.auth!.tenantId,
      userEmail:  user.email,
      successUrl: `${env.FRONTEND_URL}/assinar?sucesso=1`,
      cancelUrl:  `${env.FRONTEND_URL}/assinar`,
    });

    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /billing/portal — acesso ao portal do cliente Stripe (gerenciar assinatura)
router.post('/portal', billingRateLimiter, authRequired(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = await billingService.createPortalSession({
      tenantId:  req.auth!.tenantId,
      returnUrl: `${env.FRONTEND_URL}/config`,
    });
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /billing/webhook — chamado pelo Stripe (sem autenticação JWT, usa assinatura Stripe)
// Rate limit permissivo mas presente para absorver bursts anômalos
// IMPORTANTE: precisa de raw body — ver server.ts para o express.raw() aplicado antes do express.json()
router.post('/webhook', webhookRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) {
    return next(new AppError('BAD_REQUEST', 'stripe-signature ausente', 400));
  }

  try {
    await billingService.handleWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err: any) {
    next(new AppError('BAD_REQUEST', err.message ?? 'Webhook inválido', 400));
  }
});

export { router as billingRoutes };
