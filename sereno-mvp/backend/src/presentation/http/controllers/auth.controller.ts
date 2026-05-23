import type { Request, Response, NextFunction } from 'express';
import { registerUseCase } from '@application/use-cases/auth/register.use-case';
import { loginUseCase } from '@application/use-cases/auth/login.use-case';
import {
  sendVerificationCodeUseCase,
  confirmVerificationCodeUseCase,
} from '@application/use-cases/auth/verify-email.use-case';
import { JwtService } from '@infrastructure/crypto/jwt.service';

const jwt = new JwtService();

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await registerUseCase({
        ...(req.body as any),
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });

      // Após registro, faz login automático.
      const login = await loginUseCase({
        email: (req.body as any).email,
        password: (req.body as any).password,
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });

      jwt.setAuthCookies(res, login.accessToken, login.refreshTokenRaw);

      // Envia email de verificação de forma assíncrona (não bloqueia resposta)
      sendVerificationCodeUseCase(result.userId).catch(() => {
        // falha silenciosa — usuário pode reenviar depois
      });

      res.status(201).json({
        userId: result.userId,
        tenantId: result.tenantId,
        role: result.role,
        emailVerified: false,
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

  async logout(_req: Request, res: Response): Promise<void> {
    // TODO: revogar refresh token na tabela
    jwt.clearAuthCookies(res);
    res.status(204).send();
  },

  async me(req: Request, res: Response): Promise<void> {
    res.json({ userId: req.auth!.sub, tenantId: req.auth!.tenantId, role: req.auth!.role });
  },

  async sendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await sendVerificationCodeUseCase(req.auth!.sub);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await confirmVerificationCodeUseCase(req.auth!.sub, (req.body as any).code);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
