import { prisma } from '@config/prisma';
import { totpService } from '@infrastructure/crypto/totp.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { AppError } from '@shared/errors/app-error';
import type { MfaMethod } from '@prisma/client';

interface SetupMfaInput {
  userId: string;
  method: MfaMethod;
  ipHash?: string | null;
}

export async function setupMfaUseCase(input: SetupMfaInput) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { email: true, mfaEnabled: true, whatsapp: true },
  });

  if (user.mfaEnabled) {
    throw new AppError('CONFLICT', '2FA já está ativo nesta conta', 409);
  }

  await auditLogger.log({ action: 'AUTH_MFA_SETUP', userId: input.userId, ipHash: input.ipHash });

  if (input.method === 'WHATSAPP') {
    return { method: 'WHATSAPP' as const, whatsapp: user.whatsapp };
  }

  // APP (TOTP)
  const secret = totpService.generateSecret();
  const uri = totpService.generateUri(secret, user.email);
  const qrCodeDataUrl = await totpService.generateQrCode(uri);

  return { method: 'APP' as const, secret, qrCodeDataUrl };
}
