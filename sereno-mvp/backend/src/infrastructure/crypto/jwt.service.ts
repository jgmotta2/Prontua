import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { env } from '@config/env';
import { UserRole } from '@shared/constants/enums';

/**
 * JWT em cookies HttpOnly.
 *
 * - Access token: 15 min, em cookie `prontua_at`.
 * - Refresh token: 30 dias, em cookie `prontua_rt`, path restrito a /auth/refresh.
 *
 * Cookies setados com:
 *   httpOnly: true       -> não acessível via JS (mitiga XSS)
 *   secure: true         -> apenas HTTPS (obrigatório em prod)
 *   sameSite: 'strict'   -> não enviado em navegações cross-site (mitiga CSRF)
 *   path restrito        -> reduz superfície
 *
 * Refresh tokens são rotacionados a cada uso. Armazenamos apenas o
 * SHA-256 do token na tabela refresh_tokens (nunca o token bruto).
 * Famílias de refresh permitem detectar reuso e revogar a família inteira.
 */

export interface JwtPayload {
  sub: string;           // userId
  tenantId: string;
  role: UserRole;
}

const ACCESS_COOKIE = 'prontua_at';
const REFRESH_COOKIE = 'prontua_rt';

export class JwtService {
  signAccess(payload: JwtPayload): string {
    const opts: SignOptions = {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_TTL,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    };
    return jwt.sign(payload as object, env.JWT_ACCESS_SECRET, opts);
  }

  verifyAccess(token: string): JwtPayload {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    return decoded as JwtPayload;
  }

  /**
   * Gera um refresh token opaco (não-JWT). Retorna o token bruto (entrega
   * para o cliente) e o hash (persiste no banco).
   */
  generateRefreshToken(): { raw: string; hash: string } {
    const raw = randomBytes(64).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  hashRefresh(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = env.NODE_ENV === 'production';
    const baseOpts = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict' as const,
      domain: isProd ? env.COOKIE_DOMAIN : undefined,
    };

    res.cookie(ACCESS_COOKIE, accessToken, {
      ...baseOpts,
      path: '/',
      maxAge: env.JWT_ACCESS_TTL * 1000,
    });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...baseOpts,
      path: '/auth/refresh', // só vai para o endpoint de refresh
      maxAge: env.JWT_REFRESH_TTL * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/auth/refresh' });
  }
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
