import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '@config/env';
import type { RequestHandler } from 'express';

let redisClient: ReturnType<typeof createClient> | null = null;
let cachedStore: RedisStore | undefined;

async function getStore(): Promise<RedisStore | undefined> {
  if (env.NODE_ENV !== 'production' || !env.REDIS_URL) return undefined;
  if (cachedStore) return cachedStore;
  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (err) => console.error('[redis]', err));
    await redisClient.connect();
  }
  cachedStore = new RedisStore({
    sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
    prefix: 'rl:',
  });
  return cachedStore;
}

const baseOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  keyGenerator: (req: Express.Request) => (req as any).ip ?? 'unknown',
  handler: (_req: Express.Request, res: any) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
    });
  },
};

function lazyLimiter(windowMs: number, max: number, extra: Record<string, unknown> = {}): RequestHandler {
  let limiter: RequestHandler | null = null;
  return async (req, res, next) => {
    if (!limiter) {
      const store = await getStore().catch(() => undefined);
      limiter = rateLimit({ ...baseOptions, windowMs, max, store: store as any, ...extra });
    }
    return limiter(req, res, next);
  };
}

/** Login: 5 tentativas a cada 15 minutos por IP. */
export const loginRateLimiter: RequestHandler = lazyLimiter(
  15 * 60 * 1000,
  env.RATE_LIMIT_LOGIN_PER_15MIN,
  { skipSuccessfulRequests: true },
);

/** Registro: 3 contas por hora por IP. */
export const registerRateLimiter: RequestHandler = lazyLimiter(
  60 * 60 * 1000,
  env.RATE_LIMIT_REGISTER_PER_HOUR,
);

/** Password reset: 3 solicitações por hora por IP. */
export const passwordResetRateLimiter: RequestHandler = lazyLimiter(60 * 60 * 1000, 3);

/** API global: 60 req/min por IP (mais permissivo). */
export const apiRateLimiter: RequestHandler = lazyLimiter(60 * 1000, env.RATE_LIMIT_API_PER_MIN);

/** Ações sensíveis (delete, export LGPD): 10 por hora. */
export const sensitiveRateLimiter: RequestHandler = lazyLimiter(60 * 60 * 1000, 10);
