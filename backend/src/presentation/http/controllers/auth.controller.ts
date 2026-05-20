import type { Request, Response, NextFunction } from 'express';
import { registerUseCase } from '@application/use-cases/auth/register.use-case';
import { loginUseCase } from '@application/use-cases/auth/login.use-case';
import { refreshUseCase } from '@application/use-cases/auth/refresh.use-case';
import { JwtService, REFRESH_COOKIE } from '@infrastructure/crypto/jwt.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { prisma } from '@config/prisma';

const jwt = new JwtService();

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await registerUseCase({
        ...(req.body as any),
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });

      const login = await loginUseCase({
        email: (req.body as any).email,
        password: (req.body as any).password,
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });

      jwt.setAuthCookies(res, login.accessToken, login.refreshTokenRaw);
      res.status(201).json({
        userId: result.userId,
        tenantId: result.tenantId,
        role: result.role,
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await loginUseCase({
        ...(req.body as any),
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });

      jwt.setAuthCookies(res, result.accessToken, result.refreshTokenRaw);
      res.status(200).json({ userId: result.userId, tenantId: result.tenantId });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
      if (rawToken) {
        const hash = jwt.hashRefresh(rawToken);
        await prisma.refreshToken
          .updateMany({ where: { tokenHash: hash, revokedAt: null }, data: { revokedAt: new Date() } })
          .catch(() => {}); // silencioso — logout sempre limpa cookies
      }

      await auditLogger.log({
        action: 'AUTH_LOGOUT',
        userId: req.auth?.sub,
        tenantId: req.auth?.tenantId,
        ipHash: (req as any).ipHash,
      });

      jwt.clearAuthCookies(res);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
      const result = await refreshUseCase({
        rawToken,
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });
      jwt.setAuthCookies(res, result.accessToken, result.refreshTokenRaw);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response): Promise<void> {
    res.json({ userId: req.auth!.sub, tenantId: req.auth!.tenantId, role: req.auth!.role });
  },
};
