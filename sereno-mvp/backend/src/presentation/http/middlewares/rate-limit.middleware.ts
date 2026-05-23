import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '@config/env';
import type { RequestHandler } from 'express';

/**
 * Rate limiting com Redis como store distribuído em produção
 * (memory store funciona em dev mas não em ambiente multi-instância).
 *
 * Perfis:
 *  - login: bloqueia força bruta de credenciais
 *  - register: bloqueia criação massiva de contas
 *  - api: limite global para qualquer rota autenticada
 *  - sensitive: ações destrutivas (delete, export)
 */

let redisClient: ReturnType<typeof createClient> | null = null;

async function getStore() {
  if (env.NODE_ENV !== 'production' || !env.REDIS_URL) return undefined;
  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (err) => console.error('[redis]', err));
    await redisClient.connect();
  }
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
    prefix: 'rl:',
  });
}

const baseOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  // Em IPv6, ipKeyGenerator agrupa por sub-rede /64 (evita bypass trivial)
  keyGenerator: (req: Express.Request) => ipKeyGenerator((req as any).ip),
  handler: (_req: Express.Request, res: any) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
    });
  },
};

/** Login: 5 tentativas a cada 15 minutos por IP. */
export const loginRateLimiter: RequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_LOGIN_PER_15MIN,
  skipSuccessfulRequests: true, // login bem-sucedido não conta
  store: (await getStore().catch(() => undefined)) as any,
});

/** Registro: 3 contas por hora por IP. */
export const registerRateLimiter: RequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: env.RATE_LIMIT_REGISTER_PER_HOUR,
  store: (await getStore().catch(() => undefined)) as any,
});

/** Password reset: 3 solicitações por hora por IP. */
export const passwordResetRateLimiter: RequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 3,
  store: (await getStore().catch(() => undefined)) as any,
});

/** API global: 60 req/min por IP (mais permissivo). */
export const apiRateLimiter: RequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_API_PER_MIN,
  store: (await getStore().catch(() => undefined)) as any,
});

/** Ações sensíveis (delete, export LGPD): 10 por hora. */
export const sensitiveRateLimiter: RequestHandler = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 10,
  store: (await getStore().catch(() => undefined)) as any,
});
