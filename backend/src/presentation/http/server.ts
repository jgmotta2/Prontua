import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';

import { helmetMiddleware } from '@presentation/http/middlewares/helmet.middleware';
import { corsMiddleware } from '@presentation/http/middlewares/cors.middleware';
import { requestId } from '@presentation/http/middlewares/request-id.middleware';
import { ipHashMiddleware } from '@presentation/http/middlewares/audit.middleware';
import { csrfDefense } from '@presentation/http/middlewares/csrf.middleware';
import { apiRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import { sanitizeBody } from '@presentation/http/middlewares/sanitize.middleware';
import { errorHandler } from '@presentation/http/middlewares/error.middleware';

import { authRoutes } from '@presentation/http/routes/auth.routes';
import { patientRoutes } from '@presentation/http/routes/patient.routes';
import { dashboardRoutes } from '@presentation/http/routes/dashboard.routes';
import { sessionRoutes } from '@presentation/http/routes/session.routes';
import { noteRoutes } from '@presentation/http/routes/note.routes';
import { financeRoutes } from '@presentation/http/routes/finance.routes';
import { userRoutes } from '@presentation/http/routes/user.routes';
import { whatsappRoutes } from '@presentation/http/routes/whatsapp.routes';
import { billingRoutes } from '@presentation/http/routes/billing.routes';

export function buildServer(): Express {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestId());
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(cookieParser());

  // Webhook do Stripe precisa de raw body ANTES do express.json()
  app.use('/billing/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(sanitizeBody());
  app.use(ipHashMiddleware());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as any).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, id: req.id }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  app.use(csrfDefense());
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

  app.use('/auth',      authRoutes);
  app.use('/users',     userRoutes);
  app.use('/billing',   billingRoutes);
  app.use('/patients',  patientRoutes);
  app.use('/sessions',  sessionRoutes);
  app.use('/notes',     noteRoutes);
  app.use('/finance',   financeRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/whatsapp',  whatsappRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado' } });
  });

  app.use(errorHandler);

  return app;
}
