import { prisma } from '@config/prisma';
import { passwordService } from '@infrastructure/crypto/password.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { AppError, UnauthorizedError } from '@shared/errors/app-error';

interface DisableMfaInput {
  userId: string;
  currentPassword: string;
  ipHash?: string | null;
}

export async function disableMfaUseCase(input: DisableMfaInput) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { passwordHash: true, mfaEnabled: true, tenantId: true },
  });

  if (!user.mfaEnabled) {
    throw new AppError('CONFLICT', '2FA não está ativo', 409);
  }

  const { valid } = await passwordService.verify(user.passwordHash, input.currentPassword);
  if (!valid) throw new UnauthorizedError('Senha incorreta');

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      mfaEnabled: false,
      mfaMethod: null,
      mfaSecretEnc: null,
      mfaSecretIv: null,
      mfaSecretTag: null,
    },
  });

  await auditLogger.log({
    action: 'AUTH_MFA_DISABLED',
    userId: input.userId,
    tenantId: user.tenantId,
    ipHash: input.ipHash,
  });
}
