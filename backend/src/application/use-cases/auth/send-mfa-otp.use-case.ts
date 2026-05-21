import { createHash, randomInt } from 'node:crypto';
import { prisma } from '@config/prisma';
import { JwtService } from '@infrastructure/crypto/jwt.service';
import { env } from '@config/env';
import { AppError } from '@shared/errors/app-error';

const jwt = new JwtService();
const OTP_TTL_MS = 5 * 60 * 1000;   // 5 minutos
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;
const OTP_RATE_MAX = 3;

export async function sendMfaOtpUseCase({ tempToken }: { tempToken: string }) {
  const { sub: userId } = jwt.verifyTempMfa(tempToken);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { whatsapp: true, mfaEnabled: true, mfaMethod: true },
  });

  if (!user.mfaEnabled || user.mfaMethod !== 'WHATSAPP') {
    throw new AppError('BAD_REQUEST', 'Método WhatsApp não está ativo para este usuário', 400);
  }

  // Rate limit por usuário (não por IP — endpoint não requer auth)
  const recent = await prisma.mfaOtpToken.count({
    where: { userId, createdAt: { gte: new Date(Date.now() - OTP_RATE_WINDOW_MS) } },
  });
  if (recent >= OTP_RATE_MAX) {
    throw new AppError('TOO_MANY_REQUESTS', 'Muitos códigos enviados. Aguarde 10 minutos.', 429);
  }

  const otp = String(randomInt(100_000, 999_999 + 1));
  const hash = createHash('sha256').update(otp).digest('hex');

  await prisma.mfaOtpToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  if (env.ZAPI_INSTANCE_ID && env.ZAPI_TOKEN) {
    const phone = user.whatsapp.replace(/\D/g, '');
    const body = JSON.stringify({
      phone,
      message: `Prontua: Seu código de acesso seguro é *${otp}*. Válido por 5 minutos. Não compartilhe com ninguém.`,
    });
    await fetch(
      `${env.ZAPI_BASE_URL}/instances/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_TOKEN}/send-text`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Client-Token': env.ZAPI_CLIENT_TOKEN ?? '' }, body },
    ).catch(() => {}); // falha silenciosa — não bloqueia o login
  }

  return { sent: true };
}
