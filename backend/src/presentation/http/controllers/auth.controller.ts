import type { Request, Response, NextFunction } from 'express';
import { registerUseCase } from '@application/use-cases/auth/register.use-case';
import { loginUseCase } from '@application/use-cases/auth/login.use-case';
import { refreshUseCase } from '@application/use-cases/auth/refresh.use-case';
import { setupMfaUseCase } from '@application/use-cases/auth/setup-mfa.use-case';
import { enableMfaUseCase } from '@application/use-cases/auth/enable-mfa.use-case';
import { disableMfaUseCase } from '@application/use-cases/auth/disable-mfa.use-case';
import { sendMfaOtpUseCase } from '@application/use-cases/auth/send-mfa-otp.use-case';
import { verifyMfaUseCase } from '@application/use-cases/auth/verify-mfa.use-case';
import { JwtService, REFRESH_COOKIE } from '@infrastructure/crypto/jwt.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { prisma } from '@config/prisma';
import type { MfaMethod } from '@prisma/client';

const jwt = new JwtService();

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await registerUseCase({
        ...(req.body as any),
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });

      // Novo usuário não pode ter MFA ativo — LoginOutput garantido
      const login = await loginUseCase({
        email: (req.body as any).email,
        password: (req.body as any).password,
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      }) as import('@application/use-cases/auth/login.use-case').LoginOutput;

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

      if ('requiresTwoFactor' in result) {
        res.status(206).json(result);
        return;
      }

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
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.sub },
      select: { id: true, tenantId: true, role: true, mfaEnabled: true, mfaMethod: true },
    });
    res.json({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      mfaMethod: user.mfaMethod,
    });
  },

  // ─── 2FA ─────────────────────────────────────────────────────────────────

  async mfaSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await setupMfaUseCase({
        userId: req.auth!.sub,
        method: (req.body as any).method as MfaMethod,
        ipHash: (req as any).ipHash,
      });
      res.json(result);
    } catch (err) { next(err); }
  },

  async mfaEnable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await enableMfaUseCase({
        userId: req.auth!.sub,
        method: (req.body as any).method as MfaMethod,
        code: (req.body as any).code,
        secret: (req.body as any).secret,
        ipHash: (req as any).ipHash,
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  async mfaDisable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await disableMfaUseCase({
        userId: req.auth!.sub,
        currentPassword: (req.body as any).currentPassword,
        ipHash: (req as any).ipHash,
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  async mfaSendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await sendMfaOtpUseCase({ tempToken: (req.body as any).tempToken });
      res.json(result);
    } catch (err) { next(err); }
  },

  async mfaVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await verifyMfaUseCase({
        tempToken: (req.body as any).tempToken,
        code: (req.body as any).code,
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });
      jwt.setAuthCookies(res, result.accessToken, result.refreshTokenRaw);
      res.json({ userId: result.userId, tenantId: result.tenantId });
    } catch (err) { next(err); }
  },
};
