import express, { type Express } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { prisma } from '@config/prisma';
import pinoHttp from 'pino-http';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';

import { helmetMiddleware, permissionsPolicyMiddleware } from '@presentation/http/middlewares/helmet.middleware';
import { corsMiddleware } from '@presentation/http/middlewares/cors.middleware';
import { requestId } from '@presentation/http/middlewares/request-id.middleware';
import { ipHashMiddleware } from '@presentation/http/middlewares/audit.middleware';
import { csrfDefense } from '@presentation/http/middlewares/csrf.middleware';
import { apiRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import { errorHandler } from '@presentation/http/middlewares/error.middleware';

import { authRoutes } from '@presentation/http/routes/auth.routes';
import { patientRoutes } from '@presentation/http/routes/patient.routes';
import { dashboardRoutes } from '@presentation/http/routes/dashboard.routes';
import { sessionRoutes } from '@presentation/http/routes/session.routes';
import { financeRoutes } from '@presentation/http/routes/finance.routes';
import { consentRoutes } from '@presentation/http/routes/consent.routes';
import { voiceRoutes } from '@presentation/http/routes/voice.routes';
import { noteRoutes } from '@presentation/http/routes/note.routes';
import { searchRoutes } from '@presentation/http/routes/search.routes';

/**
 * Composição do servidor.
 *
 * Ordem dos middlewares é crítica:
 *  1. trust proxy   — para que req.ip respeite X-Forwarded-For corretamente
 *  2. requestId     — identifica a request o quanto antes para correlação
 *  3. helmet        — headers de segurança em TODA resposta (incl. erros)
 *  4. cors          — antes de qualquer rota, lida com preflight
 *  5. cookieParser  — antes do auth middleware ler o cookie
 *  6. body parsers  — com limite explícito (anti-DoS)
 *  7. ipHash        — popula req.ipHash para audit/RBAC
 *  8. logger HTTP   — registra cada request com requestId
 *  9. CSRF defense  — checa Origin em mutações
 * 10. rate limit    — global, antes das rotas
 * 11. ROUTES        — aqui entram auth/tenant/RBAC por rota
 * 12. error handler — captura tudo no fim, NUNCA expõe stack
 */
export function buildServer(): Express {
  const app = express();

  // 1. Reverse proxy (Cloudflare, NGINX, ELB)
  app.set('trust proxy', env.TRUST_PROXY);

  // 2. Request ID
  app.use(requestId());

  // 3. Helmet (headers de segurança) + Permissions-Policy
  app.use(helmetMiddleware);
  app.use(permissionsPolicyMiddleware);

  // 3b. Compressão gzip para todas as respostas
  app.use(compression());

  // 4. CORS
  app.use(corsMiddleware);

  // 5. Cookie parser
  app.use(cookieParser());

  // 6. Body parsers com limites estritos
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  // 7. IP hash
  app.use(ipHashMiddleware());

  // 8. HTTP logging (com redact configurado no logger)
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

  // 9. CSRF defense em mutações
  app.use(csrfDefense());

  // 10. Rate limit global
  app.use(apiRateLimiter);

  // ─── Health check detalhado (não-autenticado) ───
  app.get('/health', async (_req, res) => {
    const start = Date.now();
    let dbStatus = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }
    const mem = process.memoryUsage();
    res.status(dbStatus === 'ok' ? 200 : 503).json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      ts: Date.now(),
      latencyMs: Date.now() - start,
      db: dbStatus,
      uptime: Math.round(process.uptime()),
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
      version: process.env['npm_package_version'] ?? 'dev',
    });
  });

  // ─── Rotas ───
  app.use('/auth', authRoutes);
  app.use('/patients', patientRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/sessions', sessionRoutes);
  app.use('/finance', financeRoutes);
  app.use('/consent', consentRoutes);
  app.use('/voice', voiceRoutes);
  app.use('/notes', noteRoutes);
  app.use('/search', searchRoutes);

  // ── Em produção, serve o frontend (build do Vite copiado para /public) ──
  if (env.NODE_ENV === 'production') {
    const frontendPath = path.join(process.cwd(), 'public');
    app.use(express.static(frontendPath, { maxAge: '1y', etag: true, index: false }));
    // SPA fallback — rotas não encontradas retornam index.html
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: frontendPath });
    });
  } else {
    // 404 só em desenvolvimento (em prod o SPA fallback cobre tudo)
    app.use((_req, res) => {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado' } });
    });
  }

  // 12. Error handler centralizado (último)
  app.use(errorHandler);

  return app;
}
