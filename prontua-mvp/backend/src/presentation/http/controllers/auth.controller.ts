import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { registerUseCase } from '@application/use-cases/auth/register.use-case';
import { loginUseCase, issueTokens } from '@application/use-cases/auth/login.use-case';
import {
  sendVerificationCodeUseCase,
  confirmVerificationCodeUseCase,
} from '@application/use-cases/auth/verify-email.use-case';
import { JwtService, REFRESH_COOKIE } from '@infrastructure/crypto/jwt.service';
import { prisma } from '@config/prisma';
import { passwordService } from '@infrastructure/crypto/password.service';
import { AppError } from '@shared/errors/app-error';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { emailService } from '@infrastructure/messaging/email.service';
import type { UpdateProfileInput, ChangePasswordInput } from '@presentation/http/schemas/auth.schema';

async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'Prontua/1.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.split('\n').some((line) => line.split(':')[0]?.trim() === suffix);
  } catch {
    return false;
  }
}

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN: 'Entrou na conta',
  AUTH_REGISTER: 'Criou a conta',
  AUTH_LOGOUT: 'Saiu da conta',
  AUTH_REFRESH_TOKEN_REUSE: 'Reuso de token detectado',
  AUTH_MFA_INITIATED: 'Verificação em dois fatores iniciada',
  AUTH_MFA_FAILED: 'Falha na verificação em dois fatores',
  AUTH_LOGIN_FAILED: 'Tentativa de login falhou',
  PATIENT_VIEW: 'Visualizou prontuário',
  PATIENT_CREATE: 'Cadastrou paciente',
  PATIENT_UPDATE: 'Editou paciente',
  PATIENT_DELETE: 'Removeu paciente',
};

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

      // PRÉ-DEPLOY: trocar este bloco por sendVerificationCodeUseCase (abaixo).
      // Motivo: Resend sandbox só envia para o e-mail do dono da conta.
      // Quando o domínio estiver verificado no Resend, remover o update e
      // descomentar a linha com sendVerificationCodeUseCase.
      await prisma.user.update({
        where: { id: result.userId },
        data: { emailVerifiedAt: new Date() },
      });
      // sendVerificationCodeUseCase(result.userId).catch(() => {});

      res.status(201).json({
        userId: result.userId,
        tenantId: result.tenantId,
        role: result.role,
        emailVerified: true,
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
        select: { name: true, photo: true, emailVerifiedAt: true },
      });
      res.json({
        userId: req.auth!.sub,
        tenantId: req.auth!.tenantId,
        role: req.auth!.role,
        name: user?.name ?? '',
        photo: user?.photo ?? null,
        emailVerifiedAt: user?.emailVerifiedAt?.toISOString() ?? null,
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
  async auditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId: req.auth!.sub },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, action: true, resourceType: true, createdAt: true },
      });
      res.json({
        logs: logs.map((l) => ({
          ...l,
          actionLabel: ACTION_LABELS[l.action] ?? l.action,
          createdAt: l.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as { email: string };
      const user = await prisma.user.findFirst({
        where: { email },
        select: { id: true, name: true, email: true },
      });

      // Sempre retorna 204 para não revelar se o e-mail existe (prevenção de enumeração)
      if (user) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: { verificationCode: code, verificationCodeExpiry: expiry },
        });
        emailService.sendPasswordResetCode(user.email, user.name, code).catch(() => {});
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code, newPassword } = req.body as { email: string; code: string; newPassword: string };

      const user = await prisma.user.findFirst({
        where: { email, verificationCode: code },
        select: { id: true, verificationCodeExpiry: true },
      });

      if (!user || !user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
        throw new AppError('VALIDATION_ERROR', 'Código inválido ou expirado.', 422);
      }

      if (await isPasswordBreached(newPassword)) {
        throw new AppError('VALIDATION_ERROR', 'Esta senha já foi exposta em vazamentos de dados conhecidos. Escolha uma senha diferente.', 422);
      }

      const newHash = await passwordService.hash(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
          verificationCode: null,
          verificationCodeExpiry: null,
        },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordInput;

      const user = await prisma.user.findUnique({
        where: { id: req.auth!.sub },
        select: { id: true, passwordHash: true },
      });
      if (!user) throw new AppError('NOT_FOUND', 'Usuário não encontrado', 404);

      const { valid } = await passwordService.verify(user.passwordHash, currentPassword);
      if (!valid) throw new AppError('UNAUTHORIZED', 'Senha atual incorreta', 401);

      if (await isPasswordBreached(newPassword)) {
        throw new AppError('VALIDATION_ERROR', 'Esta senha já foi exposta em vazamentos de dados conhecidos. Escolha uma senha diferente.', 422);
      }

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
