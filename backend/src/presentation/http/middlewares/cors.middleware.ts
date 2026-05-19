import cors, { CorsOptions } from 'cors';
import { env } from '@config/env';

/**
 * CORS rigoroso por allowlist (não usar '*').
 * credentials: true é obrigatório para que o navegador envie o cookie
 * HttpOnly de autenticação em requisições cross-origin.
 *
 * Defesa adicional contra CSRF: SameSite=Strict no cookie + checagem
 * de Origin/Referer no middleware csrf.middleware.ts.
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (Postman, curl em dev) apenas em não-prod
    if (!origin) {
      return env.NODE_ENV === 'production'
        ? callback(new Error('Origin obrigatório'))
        : callback(null, true);
    }
    if (env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin não permitido: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
};

export const corsMiddleware = cors(corsOptions);
