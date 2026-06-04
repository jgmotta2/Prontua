import type { RequestHandler } from 'express';
import { prisma } from '@config/prisma';
import { usuarioEhAdministradorPlataforma } from '@infrastructure/platform/administrador-plataforma';
import { AppError } from '@shared/errors/app-error';
import { auditLogger } from '@infrastructure/security/audit.logger';

/**
 * Restringe rotas à equipe administrativa da plataforma (lista de espera global).
 * Deve ser usado após authRequired().
 */
export function requireAdministradorPlataforma(): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) {
      return next(new AppError('UNAUTHENTICATED', 'Não autenticado', 401));
    }

    const usuario = await prisma.user.findUnique({
      where: { id: req.auth.sub },
      select: { email: true, isAdministradorPlataforma: true, active: true },
    });

    if (!usuario?.active) {
      return next(new AppError('UNAUTHENTICATED', 'Não autenticado', 401));
    }

    const permitido = usuarioEhAdministradorPlataforma(
      usuario.email,
      usuario.isAdministradorPlataforma,
    );

    if (!permitido) {
      await auditLogger.log({
        action: 'RBAC_DENIED',
        tenantId: req.auth.tenantId,
        userId: req.auth.sub,
        ipHash: (req as { ipHash?: string }).ipHash,
        metadata: { path: req.path, method: req.method, motivo: 'admin_plataforma' },
      });
      return next(new AppError('FORBIDDEN', 'Permissão insuficiente', 403));
    }

    next();
  };
}
