import type { RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '@shared/errors/app-error';
import { auditLogger } from '@infrastructure/security/audit.logger';

/**
 * Hierarquia de permissões:
 *
 *   OWNER       ─┬─> acesso total à clínica
 *   ADMIN       ─┘
 *   PROFESSIONAL ──> acesso clínico (pacientes, sessões, prontuário)
 *   ASSISTANT    ──> apenas agenda e dados administrativos (sem prontuário)
 *
 * Recomendação: combine `requireRole` com checagens de ownership na camada
 * de use-case (ex: profissional só vê pacientes que ele atende, se a
 * política da clínica exigir).
 */

const ROLE_RANK: Record<UserRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  PROFESSIONAL: 2,
  ASSISTANT: 1,
};

/** Exige role exata (uma das listadas). */
export function requireRole(...allowed: UserRole[]): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) return next(new AppError('UNAUTHENTICATED', 'Não autenticado', 401));

    if (!allowed.includes(req.auth.role)) {
      await auditLogger.log({
        action: 'RBAC_DENIED',
        tenantId: req.auth.tenantId,
        userId: req.auth.sub,
        ipHash: (req as any).ipHash,
        metadata: { path: req.path, method: req.method, role: req.auth.role, allowed },
      });
      return next(new AppError('FORBIDDEN', 'Permissão insuficiente', 403));
    }
    next();
  };
}

/** Exige role >= mínimo na hierarquia. */
export function requireMinRole(min: UserRole): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) return next(new AppError('UNAUTHENTICATED', 'Não autenticado', 401));

    if (ROLE_RANK[req.auth.role] < ROLE_RANK[min]) {
      await auditLogger.log({
        action: 'RBAC_DENIED',
        tenantId: req.auth.tenantId,
        userId: req.auth.sub,
        ipHash: (req as any).ipHash,
        metadata: { path: req.path, method: req.method, role: req.auth.role, min },
      });
      return next(new AppError('FORBIDDEN', 'Permissão insuficiente', 403));
    }
    next();
  };
}

/** Bloqueia ASSISTANT de qualquer rota que toque prontuário clínico. */
export const requireClinicalAccess = requireMinRole(UserRole.PROFESSIONAL);
