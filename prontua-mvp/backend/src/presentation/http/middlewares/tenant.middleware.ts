import type { Request, RequestHandler } from 'express';
import { forTenant, type TenantPrisma } from '@config/prisma';
import { AppError } from '@shared/errors/app-error';

/**
 * Anexa req.db = cliente Prisma com isolamento automático por tenantId
 * extraído do JWT (req.auth.tenantId).
 *
 * Garantia: a partir deste ponto, qualquer query em modelos tenant-scoped
 * filtra/insere automaticamente pelo tenantId correto. Mesmo se o use-case
 * receber um ID de paciente vindo da URL, ele nunca consegue ler dados
 * de outra clínica — a query Prisma adiciona `WHERE tenantId = ?` na origem.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      db?: TenantPrisma;
    }
  }
}

export function tenantContext(): RequestHandler {
  return (req: Request, _res, next) => {
    if (!req.auth) {
      return next(new AppError('UNAUTHENTICATED', 'Não autenticado', 401));
    }
    req.db = forTenant(req.auth.tenantId);
    next();
  };
}
