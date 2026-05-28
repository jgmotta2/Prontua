import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Adiciona um Request ID único a cada requisição.
 * - Aceita X-Request-Id do cliente se presente (útil para correlação
 *   com logs do frontend / load balancer).
 * - Gera UUID v4 caso contrário.
 * - Expõe em response header para depuração.
 *
 * O id é consumido por logger.middleware (pino-http), audit middleware
 * e error handler para correlacionar eventos.
 */
export function requestId(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.get('x-request-id');
    const id = incoming && /^[0-9a-f-]{8,128}$/i.test(incoming) ? incoming : randomUUID();
    (req as any).id = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}
