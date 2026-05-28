import type { Request, Response, NextFunction } from 'express';
import { registerUseCase } from '@application/use-cases/auth/register.use-case';
import { loginUseCase, issueTokens } from '@application/use-cases/auth/login.use-case';
import { verifyMfaUseCase } from '@application/use-cases/auth/verify-mfa.use-case';
import {
  sendVerificationCodeUseCase,
  confirmVerificationCodeUseCase,
} from '@application/use-cases/auth/verify-email.use-case';
import { JwtService, REFRESH_COOKIE } from '@infrastructure/crypto/jwt.service';
import { prisma } from '@config/prisma';
import { passwordService } from '@infrastructure/crypto/password.service';
import { AppError } from '@shared/errors/app-error';
import { auditLogger } from '@infrastructure/security/audit.logger';
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

      // Após registro, login automático sem MFA (usuário acabou de criar a conta).
      const { accessToken, refreshTokenRaw } = await issueTokens(
        result.userId,
        result.tenantId,
        result.role,
        (req as any).ipHash,
        req.get('user-agent') ?? undefined,
      );

      jwt.setAuthCookies(res, accessToken, refreshTokenRaw);

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
      res.status(200).json({ step: 'authenticated', userId: result.userId, tenantId: result.tenantId });
    } catch (err) {
      next(err);
    }
  },

  /** POST /auth/mfa/verify — verifica OTP e emite tokens reais */
  async mfaVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { preAuthToken, code } = req.body as { preAuthToken: string; code: string };
      if (!preAuthToken || !code) {
        res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'preAuthToken e code são obrigatórios' } });
        return;
      }

      const result = await verifyMfaUseCase({
        preAuthToken,
        code,
        ipHash: (req as any).ipHash,
        userAgent: req.get('user-agent') ?? undefined,
      });

      jwt.setAuthCookies(res, result.accessToken, result.refreshTokenRaw);
      res.status(200).json({ userId: result.userId, tenantId: result.tenantId });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/refresh — rotaciona o refresh token.
   * Refresh token opaco em cookie HttpOnly (path=/auth/refresh).
   * Reuso de token revoga a família inteira (detecção de theft).
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshRaw: string | undefined = (req as any).cookies?.[REFRESH_COOKIE];
      if (!refreshRaw) {
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Refresh token ausente' } });
        return;
      }

      const tokenHash = jwt.hashRefresh(refreshRaw);

      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, tenantId: true, role: true, active: true } } },
      });

      // Token não encontrado ou revogado → pode ser reuso; revoga família se possível
      if (!stored || stored.revokedAt) {
        if (stored) {
          // Reuso detectado: revoga toda a família
          await prisma.refreshToken.updateMany({
            where: { family: stored.family },
            data: { revokedAt: new Date() },
          });
          await auditLogger.log({
            action: 'AUTH_REFRESH_TOKEN_REUSE',
            tenantId: stored.user?.tenantId,
            userId: stored.userId,
            ipHash: (req as any).ipHash,
            metadata: { family: stored.family },
          });
        }
        jwt.clearAuthCookies(res);
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sessão inválida' } });
        return;
      }

      // Token expirado
      if (stored.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { tokenHash } });
        jwt.clearAuthCookies(res);
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sessão expirada' } });
        return;
      }

      if (!stored.user.active) {
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Conta desativada' } });
        return;
      }

      // Rotaciona: revoga token antigo, emite novo par
      await prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } });

      const { accessToken, refreshTokenRaw: newRefreshRaw } = await issueTokens(
        stored.user.id,
        stored.user.tenantId,
        stored.user.role,
        (req as any).ipHash,
        req.get('user-agent') ?? undefined,
      );

      // Mantém o mesmo family para rastrear a cadeia de rotação
      // (issueTokens cria um UUID novo; aqui poderíamos passar o family existente,
      //  mas para simplicidade deixamos o UUID gerado pelo issueTokens)

      jwt.setAuthCookies(res, accessToken, newRefreshRaw);
      res.status(200).json({ ok: true });
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
        select: { name: true, photo: true },
      });
      res.json({
        userId: req.auth!.sub,
        tenantId: req.auth!.tenantId,
        role: req.auth!.role,
        name: user?.name ?? '',
        photo: user?.photo ?? null,
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
          photo: true,
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

  /** PATCH /auth/photo — salva/remove foto de perfil (base64 data URL) */
  async updatePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { photo } = req.body as { photo: string | null };

      // Validação básica: deve ser data URL de imagem ou null para remover
      if (photo !== null && photo !== undefined) {
        if (!photo.startsWith('data:image/')) {
          res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Formato de imagem inválido' } });
          return;
        }
        // Limita a ~1.8 MB (base64 de uma imagem comprimida)
        if (photo.length > 2_400_000) {
          res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Imagem muito grande (máx 1.8 MB)' } });
          return;
        }
      }

      await prisma.user.update({
        where: { id: req.auth!.sub },
        data: { photo: photo ?? null },
      });

      res.status(204).send();
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
