import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { hashIp } from '@infrastructure/security/hash.util';
import type { AuditAction } from '@prisma/client';

/**
 * Calcula um hash com pepper do IP do cliente, anexa em req.ipHash
 * para ser consumido por audit e RBAC. Nunca persistimos o IP bruto.
 *
 * `trust proxy` precisa estar configurado (env TRUST_PROXY) para que
 * req.ip respeite X-Forwarded-For corretamente.
 */
export function ipHashMiddleware(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    (req as any).ipHash = ip ? hashIp(ip) : null;
    next();
  };
}

/**
 * Audita uma ação após a resposta ser enviada com sucesso (status < 400).
 *
 * Uso em rota:
 *   router.get('/patients/:id', auth(), tenantContext(),
 *     audit('PATIENT_VIEW', (req) => ({ resourceId: req.params.id })),
 *     controller.show);
 *
 * Importante: metadata NUNCA deve conter PII/PHI. Use IDs, contadores,
 * códigos de erro — nada de nomes, conteúdo de prontuário, telefones.
 */
export function audit(
  action: AuditAction,
  extract?: (req: Request) => {
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  },
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      // Só audita resposta de sucesso. Falhas (4xx/5xx) são tratadas
      // separadamente pelo error middleware quando relevante.
      if (res.statusCode >= 400) return;

      const extracted = extract?.(req) ?? {};
      void auditLogger.log({
        action,
        tenantId: req.auth?.tenantId,
        userId: req.auth?.sub,
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
        ...extracted,
      });
    });
    next();
  };
}
