import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { JwtService, type JwtPayload } from '@infrastructure/crypto/jwt.service';
import { AppError } from '@shared/errors/app-error';

/**
 * Extensão do Request com contexto de auth tipado.
 * Use `req.auth` em qualquer rota protegida.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

const ACCESS_COOKIE_NAME = 'prontua_at';

const jwt = new JwtService();

/**
 * Lê o token de acesso do cookie HttpOnly, valida assinatura e expiração,
 * e popula req.auth com { sub, tenantId, role }.
 *
 * - Cookie HttpOnly impede leitura via document.cookie (anti-XSS).
 * - Secure + SameSite=Strict impede CSRF.
 * - Sem fallback Authorization header: impede tokens trafegando via
 *   query string, localStorage ou contextos vulneráveis.
 */
export function authRequired(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token: string | undefined = (req as any).cookies?.[ACCESS_COOKIE_NAME];
    if (!token) {
      return next(new AppError('UNAUTHENTICATED', 'Não autenticado', 401));
    }

    try {
      const payload = jwt.verifyAccess(token);
      req.auth = payload;
      next();
    } catch (err) {
      next(new AppError('UNAUTHENTICATED', 'Sessão inválida ou expirada', 401));
    }
  };
}

/**
 * Permite acesso opcional — popula req.auth se houver cookie válido,
 * mas não bloqueia rotas públicas (ex: webhook público).
 */
export function authOptional(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token: string | undefined = (req as any).cookies?.[ACCESS_COOKIE_NAME];
    if (!token) return next();
    try {
      req.auth = jwt.verifyAccess(token);
    } catch {
      // silencioso — rota é opcional
    }
    next();
  };
}

export { ACCESS_COOKIE_NAME };
