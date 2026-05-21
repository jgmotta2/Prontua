import 'dotenv/config';
import { z } from 'zod';

/**
 * Validação rigorosa das variáveis de ambiente.
 * Falha rápido (fail-fast) no boot se algum segredo crítico estiver ausente
 * ou malformado. Evita configurações inseguras silenciosas em produção.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  CORS_ORIGINS: z.string().min(1).transform((s) => s.split(',').map((o) => o.trim())),
  COOKIE_DOMAIN: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter no mínimo 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
  JWT_ISSUER: z.string().default('sereno-api'),
  JWT_AUDIENCE: z.string().default('sereno-app'),

  ENCRYPTION_MASTER_KEY: z.string().refine(
    (s) => {
      try {
        return Buffer.from(s, 'base64').length === 32;
      } catch {
        return false;
      }
    },
    'ENCRYPTION_MASTER_KEY deve ser base64 de 32 bytes (AES-256)',
  ),
  ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),
  HASH_PEPPER: z.string().min(16),

  ARGON_MEMORY_COST: z.coerce.number().int().positive().default(65_536),
  ARGON_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON_PARALLELISM: z.coerce.number().int().positive().default(1),

  REDIS_URL: z.string().url().optional(),
  RATE_LIMIT_LOGIN_PER_15MIN: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_REGISTER_PER_HOUR: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_API_PER_MIN: z.coerce.number().int().positive().default(60),

  ZAPI_INSTANCE_ID: z.string().optional(),
  ZAPI_TOKEN: z.string().optional(),
  ZAPI_CLIENT_TOKEN: z.string().optional(),
  ZAPI_BASE_URL: z.string().url().default('https://api.z-api.io'),
  ZAPI_WEBHOOK_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  MFA_ISSUER: z.string().default('Prontua'),

  FRONTEND_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuração de ambiente inválida:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
