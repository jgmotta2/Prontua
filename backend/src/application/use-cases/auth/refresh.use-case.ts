import { prisma } from '@config/prisma';
import { JwtService } from '@infrastructure/crypto/jwt.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { UnauthorizedError } from '@shared/errors/app-error';

interface RefreshInput {
  rawToken: string | undefined;
  ipHash: string | null;
  userAgent?: string;
}

const jwt = new JwtService();

/**
 * Troca um refresh token válido por novos tokens (access + refresh).
 *
 * Defesas:
 *  - Token armazenado apenas como SHA-256 hash (nunca o valor bruto).
 *  - Rotação obrigatória: token usado é revogado imediatamente.
 *  - Detecção de reutilização: se um token já revogado for apresentado,
 *    toda a família é revogada (indica que o token pode ter sido roubado).
 *  - Expiração preservada: o novo token mantém o expiresAt original
 *    para que a sessão não se renove indefinidamente.
 */
export async function refreshUseCase(input: RefreshInput): Promise<{
  accessToken: string;
  refreshTokenRaw: string;
}> {
  if (!input.rawToken) {
    throw new UnauthorizedError('Sessão expirada');
  }

  const hash = jwt.hashRefresh(input.rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where:   { tokenHash: hash },
    include: {
      user: {
        select: { id: true, tenantId: true, role: true, active: true },
      },
    },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Sessão expirada');
  }

  // Reutilização de token revogado → possível roubo, revoga toda a família.
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { family: stored.family },
      data:  { revokedAt: new Date() },
    });
    await auditLogger.log({
      action:   'AUTH_TOKEN_REFRESH',
      userId:   stored.userId,
      tenantId: stored.user?.tenantId,
      ipHash:   input.ipHash,
      metadata: { reason: 'token_reuse_detected_family_revoked' },
    });
    throw new UnauthorizedError('Sessão inválida — faça login novamente');
  }

  if (!stored.user?.active) {
    throw new UnauthorizedError('Conta inativa');
  }

  // Revoga o token atual (rotação).
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data:  { revokedAt: new Date() },
  });

  // Emite novos tokens.
  const accessToken  = jwt.signAccess({
    sub:      stored.user.id,
    tenantId: stored.user.tenantId,
    role:     stored.user.role,
  });
  const newRefresh = jwt.generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId:    stored.userId,
      tokenHash: newRefresh.hash,
      family:    stored.family,
      expiresAt: stored.expiresAt, // mantém expiração original
      ipHash:    input.ipHash,
      userAgent: input.userAgent?.slice(0, 256),
    },
  });

  await auditLogger.log({
    action:   'AUTH_TOKEN_REFRESH',
    userId:   stored.user.id,
    tenantId: stored.user.tenantId,
    ipHash:   input.ipHash,
  });

  return { accessToken, refreshTokenRaw: newRefresh.raw };
}
