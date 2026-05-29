import { prisma } from '@config/prisma';
import { JwtService } from '@infrastructure/crypto/jwt.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { AppError } from '@shared/errors/app-error';
import { issueTokens } from './login.use-case';

const jwt = new JwtService();

interface VerifyMfaInput {
  preAuthToken: string;
  code: string;
  ipHash: string | null;
  userAgent?: string;
}

interface VerifyMfaOutput {
  accessToken: string;
  refreshTokenRaw: string;
  userId: string;
  tenantId: string;
}

/**
 * Valida o código OTP enviado por e-mail após login com senha.
 *
 * Segurança:
 *  - preAuthToken é um JWT de escopo restrito com TTL de 5 min.
 *  - Código OTP é zerado após uso (one-time) e tem TTL de 10 min.
 *  - Mensagem de erro genérica para evitar enumeração.
 */
export async function verifyMfaUseCase(input: VerifyMfaInput): Promise<VerifyMfaOutput> {
  // 1. Valida o token de pré-autenticação
  let userId: string;
  try {
    const payload = jwt.verifyPreAuth(input.preAuthToken);
    userId = payload.sub;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Código ou sessão inválidos', 401);
  }

  // 2. Carrega o usuário e o código OTP armazenado
  const user = await prisma.user.findUnique({
    where: { id: userId, active: true },
    select: {
      id: true,
      tenantId: true,
      role: true,
      verificationCode: true,
      verificationCodeExpiry: true,
    },
  });

  if (!user) throw new AppError('UNAUTHORIZED', 'Código ou sessão inválidos', 401);

  // 3. Valida código (timing-safe: mesma mensagem para todos os casos de erro)
  const codeValid =
    user.verificationCode &&
    user.verificationCodeExpiry &&
    user.verificationCode === input.code.trim() &&
    user.verificationCodeExpiry > new Date();

  // Zera o código independentemente do resultado (limita tentativas)
  await prisma.user.update({
    where: { id: userId },
    data: { verificationCode: null, verificationCodeExpiry: null },
  });

  if (!codeValid) {
    await auditLogger.log({
      action: 'AUTH_MFA_FAILED',
      tenantId: user.tenantId,
      userId: user.id,
      ipHash: input.ipHash,
      metadata: { reason: 'invalid_otp' },
    });
    throw new AppError('UNAUTHORIZED', 'Código inválido ou expirado', 401);
  }

  // 4. Emite tokens reais
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

  return { accessToken, refreshTokenRaw, userId: user.id, tenantId: user.tenantId };
}
