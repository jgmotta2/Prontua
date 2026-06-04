import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '@config/env';
import type { RequestHandler } from 'express';

/**
 * Rate limiting com Redis como store distribuído em produção
 * (memory store funciona em dev mas não em ambiente multi-instância).
 *
 * Fix: top-level await removido — store Redis é injetada de forma lazy
 * via middleware wrapper para compatibilidade com CJS/tsx em dev.
 */

let redisClient: ReturnType<typeof createClient> | null = null;
let redisStore: RedisStore | undefined;
let redisInitialized = false;

/**
 * Inicializa o Redis store uma única vez em produção.
 * Em desenvolvimento retorna undefined (usa memory store do express-rate-limit).
 */
async function initRedisStore(): Promise<RedisStore | undefined> {
  if (redisInitialized) return redisStore;
  redisInitialized = true;

  if (env.NODE_ENV !== 'production' || !env.REDIS_URL) return undefined;

  try {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (err) => console.error('[redis rate-limit]', err));
    await redisClient.connect();
    redisStore = new RedisStore({
      sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
      prefix: 'rl:',
    });
  } catch (err) {
    console.error('[redis rate-limit] falha ao conectar, usando memory store:', err);
  }

  return redisStore;
}

// Dispara a inicialização assíncrona do Redis em background (produção)
// Não bloqueia o boot — se Redis não estiver pronto na primeira request,
// o fallback de memory store é usado automaticamente.
void initRedisStore();

const baseOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  // Agrega IPv6 por /64 manualmente (evita bypass via endereços dentro do mesmo bloco)
  keyGenerator: (req: Express.Request) => {
    const ip = (req as any).ip ?? (req as any).socket?.remoteAddress ?? '0.0.0.0';
    // Se IPv6, usa os primeiros 4 grupos (64 bits) como chave
    if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':');
    return ip;
  },
  handler: (_req: Express.Request, res: any) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
    });
  },
};

/** Wrapper que injeta o store Redis quando disponível */
function makeLimiter(opts: Parameters<typeof rateLimit>[0]): RequestHandler {
  return rateLimit({
    ...opts,
    // store é lido em runtime — já estará preenchido quando o Redis conectar
    get store() { return redisStore as any; },
  });
}

/** Login: 5 tentativas a cada 15 minutos por IP. */
export const loginRateLimiter: RequestHandler = makeLimiter({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_LOGIN_PER_15MIN,
  skipSuccessfulRequests: true,
});

/** Registro: 3 contas por hora por IP. */
export const registerRateLimiter: RequestHandler = makeLimiter({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: env.RATE_LIMIT_REGISTER_PER_HOUR,
});

/** Password reset: 3 solicitações por hora por IP. */
export const passwordResetRateLimiter: RequestHandler = makeLimiter({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 3,
});

/** API global: 60 req/min por IP (mais permissivo). */
export const apiRateLimiter: RequestHandler = makeLimiter({
  ...baseOptions,
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_API_PER_MIN,
});

/** Ações sensíveis (delete, export LGPD): 10 por hora. */
export const sensitiveRateLimiter: RequestHandler = makeLimiter({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 10,
});

/** Inscrição na lista de espera (landing): 10 por hora por IP. */
export const listaEsperaRateLimiter: RequestHandler = makeLimiter({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: env.RATE_LIMIT_LISTA_ESPERA_PER_HOUR,
});
