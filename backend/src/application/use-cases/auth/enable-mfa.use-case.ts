import { prisma } from '@config/prisma';
import { totpService } from '@infrastructure/crypto/totp.service';
import { encryptionService } from '@infrastructure/crypto/encryption.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { AppError, UnauthorizedError } from '@shared/errors/app-error';
import type { MfaMethod } from '@prisma/client';

interface EnableMfaInput {
  userId: string;
  method: MfaMethod;
  code: string;
  secret?: string; // required for APP method
  ipHash?: string | null;
}

export async function enableMfaUseCase(input: EnableMfaInput) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { mfaEnabled: true, tenantId: true },
  });

  if (user.mfaEnabled) {
    throw new AppError('CONFLICT', '2FA já está ativo', 409);
  }

  if (input.method === 'APP') {
    if (!input.secret) throw new AppError('BAD_REQUEST', 'Secret é obrigatório para método APP', 400);
    const valid = totpService.verify(input.secret, input.code);
    if (!valid) throw new UnauthorizedError('Código TOTP inválido');

    const encrypted = encryptionService.encrypt(input.secret);
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        mfaEnabled: true,
        mfaMethod: 'APP',
        mfaSecretEnc: encrypted.ciphertext,
        mfaSecretIv: encrypted.iv,
        mfaSecretTag: encrypted.tag,
      },
    });
  } else {
    // WHATSAPP: método não precisa de QR — só habilita
    await prisma.user.update({
      where: { id: input.userId },
      data: { mfaEnabled: true, mfaMethod: 'WHATSAPP' },
    });
  }

  await auditLogger.log({
    action: 'AUTH_MFA_ENABLED',
    userId: input.userId,
    tenantId: user.tenantId,
    ipHash: input.ipHash,
    metadata: { method: input.method },
  });
}
