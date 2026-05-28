import { prisma } from '@config/prisma';
import { AppError } from '@shared/errors/app-error';
import { emailService } from '@infrastructure/messaging/email.service';

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerificationCodeUseCase(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  });

  if (!user) throw new AppError('NOT_FOUND', 'Usuário não encontrado', 404);
  if (user.emailVerifiedAt) throw new AppError('CONFLICT', 'E-mail já verificado', 409);

  const code = generateCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  await prisma.user.update({
    where: { id: userId },
    data: { verificationCode: code, verificationCodeExpiry: expiry },
  });

  await emailService.sendVerificationCode(user.email, user.name, code);
}

export async function confirmVerificationCodeUseCase(
  userId: string,
  code: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      emailVerifiedAt: true,
      verificationCode: true,
      verificationCodeExpiry: true,
    },
  });

  if (!user) throw new AppError('NOT_FOUND', 'Usuário não encontrado', 404);
  if (user.emailVerifiedAt) throw new AppError('CONFLICT', 'E-mail já verificado', 409);

  if (
    !user.verificationCode ||
    !user.verificationCodeExpiry ||
    user.verificationCode !== code.trim() ||
    user.verificationCodeExpiry < new Date()
  ) {
    throw new AppError('VALIDATION_ERROR', 'Código inválido ou expirado', 422);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
      verificationCode: null,
      verificationCodeExpiry: null,
    },
  });
}
