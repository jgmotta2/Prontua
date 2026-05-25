import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@config/prisma';
import { JwtService } from '@infrastructure/crypto/jwt.service';
import { totpService } from '@infrastructure/crypto/totp.service';
import { encryptionService } from '@infrastructure/crypto/encryption.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { UnauthorizedError } from '@shared/errors/app-error';

const jwt = new JwtService();

interface VerifyMfaInput {
  tempToken: string;
  code: string;
  ipHash?: string | null;
  userAgent?: string;
}

export async function verifyMfaUseCase(input: VerifyMfaInput) {
  const { sub: userId } = jwt.verifyTempMfa(input.tempToken);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      role: true,
      mfaEnabled: true,
      mfaMethod: true,
      mfaSecretEnc: true,
      mfaSecretIv: true,
      mfaSecretTag: true,
    },
  });

  if (!user.mfaEnabled || !user.mfaMethod) {
    throw new UnauthorizedError('2FA não está ativo');
  }

  let valid = false;

  if (user.mfaMethod === 'APP') {
    if (!user.mfaSecretEnc || !user.mfaSecretIv || !user.mfaSecretTag) {
      throw new UnauthorizedError('Configuração 2FA inválida');
    }
    const secret = encryptionService.decrypt({
      ciphertext: user.mfaSecretEnc,
      iv: user.mfaSecretIv,
      tag: user.mfaSecretTag,
      keyVersion: 1,
    });
    valid = totpService.verify(secret, input.code);
  } else if (user.mfaMethod === 'WHATSAPP') {
    const hash = createHash('sha256').update(input.code).digest('hex');
    const token = await prisma.mfaOtpToken.findFirst({
      where: { userId, tokenHash: hash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (token) {
      valid = true;
      await prisma.mfaOtpToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    }
  }

  if (!valid) {
    await auditLogger.log({
      action: 'AUTH_MFA_FAILED',
      userId,
      tenantId: user.tenantId,
      ipHash: input.ipHash,
      metadata: { method: user.mfaMethod },
    });
    throw new UnauthorizedError('Código 2FA inválido');
  }

  // Emite tokens reais
  const accessToken = jwt.signAccess({ sub: user.id, tenantId: user.tenantId, role: user.role });
  const refresh = jwt.generateRefreshToken();
  const family = randomUUID();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      family,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ipHash: input.ipHash,
      userAgent: input.userAgent?.slice(0, 256),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });

  await auditLogger.log({
    action: 'AUTH_MFA_VERIFIED',
    userId: user.id,
    tenantId: user.tenantId,
    ipHash: input.ipHash,
    metadata: { method: user.mfaMethod },
  });

  return {
    accessToken,
    refreshTokenRaw: refresh.raw,
    userId: user.id,
    tenantId: user.tenantId,
  };
}
