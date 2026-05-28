import pino from 'pino';
import { env } from '@config/env';

/**
 * Logger estruturado (JSON em prod, pretty em dev).
 *
 * Redact list: nunca logamos campos sensíveis mesmo se chegarem
 * por engano no payload de log.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password', '*.password',
      'passwordHash', '*.passwordHash',
      'token', '*.token',
      'authorization', 'cookie', 'headers.cookie', 'headers.authorization',
      'mfaSecret', '*.mfaSecret',
      'contentEnc', '*.contentEnc',
      'document', '*.document', 'cpf', '*.cpf',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});
