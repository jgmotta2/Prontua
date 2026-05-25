import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireSubscription } from '@presentation/http/middlewares/subscription.middleware';
import { dashboardController } from '@presentation/http/controllers/dashboard.controller';

/**
 * Dashboard exibe contadores agregados (sem PHI) — qualquer role autenticada
 * da clínica pode visualizar. O nome do paciente na agenda de hoje só
 * aparece para roles com acesso clínico em iterações futuras; nesta versão,
 * MVP, mantemos visível para todos os papéis pra simplicidade da gestão.
 */
const router = Router();

router.use(authRequired(), requireSubscription(), tenantContext());

router.get('/overview', dashboardController.overview);

export { router as dashboardRoutes };
