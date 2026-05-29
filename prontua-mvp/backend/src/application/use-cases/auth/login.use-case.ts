import { prisma } from '@config/prisma';
import { passwordService } from '@infrastructure/crypto/password.service';
import { JwtService } from '@infrastructure/crypto/jwt.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { UnauthorizedError } from '@shared/errors/app-error';
import { randomUUID } from 'node:crypto';

/**
 * Hash dummy pré-computado para timing equalization.
 * Garante que respostas para emails inexistentes levem o mesmo tempo
 * que respostas para senhas erradas (anti user-enumeration via timing).
 *
 * Computed once at module load — argon2 é lento por design.
 */
const TIMING_DUMMY_HASH: Promise<string> = passwordService.hash(
  'prontua-timing-equalization-placeholder-not-a-real-password',
);

interface LoginInput {
  email: string;
  password: string;
  ipHash: string | null;
  userAgent?: string;
}

export type LoginOutput =
  { step: 'authenticated'; accessToken: string; refreshTokenRaw: string; userId: string; tenantId: string };

const jwt = new JwtService();
const LOCK_THRESHOLD = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * Autenticação com proteção contra:
 *  - Force brute (rate limit + lockout após N falhas)
 *  - User enumeration (mesma mensagem para email inexistente e senha errada)
 *  - Timing attack (passwordService.verify usa comparação constante; e
 *    realizamos um hash dummy quando o usuário não existe para nivelar
 *    o tempo de resposta)
 *  - Refresh token theft (armazenamos apenas SHA-256, com `family` para
 *    detecção de reuso)
 */
export async function loginUseCase(input: LoginInput): Promise<LoginOutput> {
  const user = await prisma.user.findFirst({
    where: { email: input.email, active: true },
  });

  // Timing-equalization: se o usuário não existe, ainda gastamos tempo
  // verificando contra um hash real para que um atacante não consiga
  // inferir existência via diferença de latência.
  if (!user) {
    await passwordService.verify(await TIMING_DUMMY_HASH, input.password);
    await auditLogger.log({
      action: 'AUTH_LOGIN_FAILED',
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      metadata: { reason: 'unknown_user' },
    });
    throw new UnauthorizedError('Credenciais inválidas');
  }

  // Conta bloqueada?
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await auditLogger.log({
      action: 'AUTH_LOGIN_FAILED',
      tenantId: user.tenantId,
      userId: user.id,
      ipHash: input.ipHash,
      metadata: { reason: 'account_locked' },
    });
    throw new UnauthorizedError('Conta temporariamente bloqueada. Tente novamente em instantes.');
  }

  const { valid, needsRehash } = await passwordService.verify(user.passwordHash, input.password);

  if (!valid) {
    const failed = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed,
        lockedUntil: failed >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_DURATION_MS) : undefined,
      },
    });
    await auditLogger.log({
      action: 'AUTH_LOGIN_FAILED',
      tenantId: user.tenantId,
      userId: user.id,
      ipHash: input.ipHash,
      metadata: { reason: 'bad_password', failedCount: failed },
    });
    throw new UnauthorizedError('Credenciais inválidas');
  }

  // Rehash transparente quando params Argon2 forem atualizados.
  if (needsRehash) {
    const newHash = await passwordService.hash(input.password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });

  const { accessToken, refreshTokenRaw } = await issueTokens(
    user.id,
    user.tenantId,
    user.role,
    input.ipHash,
    input.userAgent,
  );

  await auditLogger.log({
    action: 'AUTH_LOGIN',
    tenantId: user.tenantId,
    userId: user.id,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
  });

  return { step: 'authenticated', accessToken, refreshTokenRaw, userId: user.id, tenantId: user.tenantId };
}

/**
 * Emite tokens reais após validação bem-sucedida do OTP.
 * Chamado por verifyMfaUseCase após confirmar o código.
 */
export async function issueTokens(
  userId: string,
  tenantId: string,
  role: string,
  ipHash: string | null,
  userAgent?: string,
): Promise<{ accessToken: string; refreshTokenRaw: string }> {
  const accessToken = jwt.signAccess({ sub: userId, tenantId, role: role as any });
  const refresh = jwt.generateRefreshToken();
  const family = randomUUID();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: refresh.hash,
      family,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ipHash,
      userAgent: userAgent?.slice(0, 256),
    },
  });

  return { accessToken, refreshTokenRaw: refresh.raw };
}
