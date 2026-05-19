import rateLimit, { type Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '@config/env';
import type { RequestHandler } from 'express';

/**
 * Rate limiting com Redis como store distribuído em produção
 * (memory store funciona em dev mas não em ambiente multi-instância).
 */

let redisClient: ReturnType<typeof createClient> | null = null;

async function obterStoreRedis(): Promise<RedisStore | undefined> {
  if (env.NODE_ENV !== 'production' || !env.REDIS_URL) {
    return undefined;
  }

  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (erro) => console.error('[redis]', erro));
    await redisClient.connect();
  }

  return new RedisStore({
    sendCommand: (...argumentos: string[]) => redisClient!.sendCommand(argumentos),
    prefix: 'rl:',
  });
}

const opcoesBase: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (requisicao: Express.Request) =>
    (requisicao as Express.Request & { ip?: string }).ip ?? 'desconhecido',
  handler: (_requisicao: Express.Request, resposta: Express.Response) => {
    resposta.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
    });
  },
};

type RateLimiterDelegado = RequestHandler & {
  definir: (middleware: RequestHandler) => void;
};

function criarRateLimiterDelegado(): RateLimiterDelegado {
  let middlewareInterno: RequestHandler | null = null;

  const delegado = ((requisicao, resposta, next) => {
    if (!middlewareInterno) {
      next(new Error('Rate limiters ainda não inicializados. Chame inicializarRateLimiters() no bootstrap.'));
      return;
    }
    return middlewareInterno(requisicao, resposta, next);
  }) as RateLimiterDelegado;

  delegado.definir = (middleware: RequestHandler) => {
    middlewareInterno = middleware;
  };

  return delegado;
}

export const loginRateLimiter = criarRateLimiterDelegado();
export const registerRateLimiter = criarRateLimiterDelegado();
export const passwordResetRateLimiter = criarRateLimiterDelegado();
export const apiRateLimiter = criarRateLimiterDelegado();
export const sensitiveRateLimiter = criarRateLimiterDelegado();

export async function inicializarRateLimiters(): Promise<void> {
  const store = await obterStoreRedis().catch(() => undefined);

  loginRateLimiter.definir(
    rateLimit({
      ...opcoesBase,
      windowMs: 15 * 60 * 1000,
      max: env.RATE_LIMIT_LOGIN_PER_15MIN,
      skipSuccessfulRequests: true,
      store,
    }),
  );

  registerRateLimiter.definir(
    rateLimit({
      ...opcoesBase,
      windowMs: 60 * 60 * 1000,
      max: env.RATE_LIMIT_REGISTER_PER_HOUR,
      store,
    }),
  );

  passwordResetRateLimiter.definir(
    rateLimit({
      ...opcoesBase,
      windowMs: 60 * 60 * 1000,
      max: 3,
      store,
    }),
  );

  apiRateLimiter.definir(
    rateLimit({
      ...opcoesBase,
      windowMs: 60 * 1000,
      max: env.RATE_LIMIT_API_PER_MIN,
      store,
    }),
  );

  sensitiveRateLimiter.definir(
    rateLimit({
      ...opcoesBase,
      windowMs: 60 * 60 * 1000,
      max: 10,
      store,
    }),
  );
}
