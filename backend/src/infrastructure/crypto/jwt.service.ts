import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { env } from '@config/env';
import { UserRole } from '@prisma/client';

/**
 * JWT em cookies HttpOnly.
 *
 * - Access token: 15 min, em cookie `sereno_at`.
 * - Refresh token: 30 dias, em cookie `sereno_rt`, path restrito a /auth/refresh.
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

const ACCESS_COOKIE = 'sereno_at';
const REFRESH_COOKIE = 'sereno_rt';

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

  /**
   * Token temporário para o segundo fator do 2FA (5 min, não gera cookie).
   * Claim `purpose: 'mfa_challenge'` distingue do access token normal.
   */
  signTempMfa(userId: string): string {
    return jwt.sign(
      { sub: userId, purpose: 'mfa_challenge' },
      env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: 300, issuer: env.JWT_ISSUER },
    );
  }

  verifyTempMfa(token: string): { sub: string } {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
    }) as { sub: string; purpose: string };
    if (decoded.purpose !== 'mfa_challenge') {
      throw new Error('Token inválido');
    }
    return { sub: decoded.sub };
  }
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
