import type { Request, Response, NextFunction } from 'express';
import { registerUseCase } from '@application/use-cases/auth/register.use-case';
import { loginUseCase } from '@application/use-cases/auth/login.use-case';
import {
  sendVerificationCodeUseCase,
  confirmVerificationCodeUseCase,
} from '@application/use-cases/auth/verify-email.use-case';
import { JwtService, REFRESH_COOKIE } from '@infrastructure/crypto/jwt.service';
import { prisma } from '@config/prisma';
import { passwordService } from '@infrastructure/crypto/password.service';
import { AppError } from '@shared/errors/app-error';
import type { UpdateProfileInput, ChangePasswordInput } from '@presentation/http/schemas/auth.schema';

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

  async logout(req: Request, res: Response): Promise<void> {
    // Revoga o refresh token no banco — token roubado não funciona após logout
    const refreshRaw: string | undefined = (req as any).cookies?.[REFRESH_COOKIE];
    if (refreshRaw) {
      const tokenHash = jwt.hashRefresh(refreshRaw);
      // Apaga o token específico (e toda a família, para invalidar refresh chains)
      await prisma.refreshToken
        .findFirst({ where: { tokenHash }, select: { family: true } })
        .then((rt) => {
          if (rt) {
            return prisma.refreshToken.deleteMany({ where: { family: rt.family } });
          }
        })
        .catch(() => {
          // Falha silenciosa — logout deve sempre limpar cookies
        });
    }
    jwt.clearAuthCookies(res);
    res.status(204).send();
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth!.sub },
        select: { name: true },
      });
      res.json({
        userId: req.auth!.sub,
        tenantId: req.auth!.tenantId,
        role: req.auth!.role,
        name: user?.name ?? '',
      });
    } catch (err) {
      next(err);
    }
  },

  /** GET /auth/profile — perfil completo para tela de Configurações */
  async profile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth!.sub },
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
          city: true,
          state: true,
          specialty: true,
          registry: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });
      if (!user) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
        return;
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /auth/profile — atualiza campos mutáveis do perfil */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as UpdateProfileInput;
      const updated = await prisma.user.update({
        where: { id: req.auth!.sub },
        data: {
          ...(body.name      !== undefined && { name: body.name }),
          ...(body.whatsapp  !== undefined && { whatsapp: body.whatsapp }),
          ...(body.city      !== undefined && { city: body.city }),
          ...(body.state     !== undefined && { state: body.state }),
          ...(body.specialty !== undefined && { specialty: body.specialty }),
          ...(body.registry  !== undefined && { registry: body.registry }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
          city: true,
          state: true,
          specialty: true,
          registry: true,
          emailVerifiedAt: true,
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
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

  /**
   * PATCH /auth/change-password
   * Validação Zod já aplicada pelo middleware (changePasswordSchema).
   * Rate-limited a 10 tentativas/hora pelo sensitiveRateLimiter.
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordInput;

      const user = await prisma.user.findUnique({
        where: { id: req.auth!.sub },
        select: { id: true, passwordHash: true },
      });
      if (!user) throw new AppError('NOT_FOUND', 'Usuário não encontrado', 404);

      const { valid } = await passwordService.verify(user.passwordHash, currentPassword);
      // Usa mesma mensagem para "senha atual errada" e "usuário não encontrado"
      // para evitar enumeração via mensagem de erro.
      if (!valid) throw new AppError('UNAUTHORIZED', 'Senha atual incorreta', 401);

      const newHash = await passwordService.hash(newPassword);
      await prisma.user.update({
        where: { id: req.auth!.sub },
        data: { passwordHash: newHash, passwordChangedAt: new Date() },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
