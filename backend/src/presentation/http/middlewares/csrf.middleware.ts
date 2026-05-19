import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '@config/env';
import { AppError } from '@shared/errors/app-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defesa em profundidade contra CSRF.
 *
 * Primária:  cookie HttpOnly + SameSite=Strict (impede que outro site
 *            envie credenciais cross-origin).
 * Segunda:   este middleware valida Origin/Referer em qualquer mutação.
 *
 * Aceita apenas requisições com Origin/Referer pertencente à allowlist
 * de CORS. Se nenhum header for enviado em método mutador, rejeita.
 *
 * Não usa double-submit token porque com SameSite=Strict + Origin check
 * o vetor é fechado e mantemos a API stateless. Se precisar suportar
 * SameSite=Lax (cross-subdomain) no futuro, adicione token CSRF rotativo.
 */
export function csrfDefense(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get('origin') ?? req.get('referer');
    if (!origin) {
      return next(new AppError('CSRF_BLOCKED', 'Origem ausente', 403));
    }

    const ok = env.CORS_ORIGINS.some((allowed) => origin.startsWith(allowed));
    if (!ok) {
      return next(new AppError('CSRF_BLOCKED', 'Origem não permitida', 403));
    }

    next();
  };
}
