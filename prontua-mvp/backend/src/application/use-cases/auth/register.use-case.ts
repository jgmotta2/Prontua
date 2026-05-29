import { createHash } from 'node:crypto';
import { prisma } from '@config/prisma';
import { passwordService } from '@infrastructure/crypto/password.service';
import { auditLogger } from '@infrastructure/security/audit.logger';
import { ConflictError, AppError } from '@shared/errors/app-error';
import type { RegisterInput } from '@presentation/http/schemas/auth.schema';
import { UserRole } from '@shared/constants/enums';

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
    return false; // fail open — não bloquear cadastro se HIBP estiver fora
  }
}

interface RegisterUseCaseInput extends RegisterInput {
  ipHash: string | null;
  userAgent?: string;
}

interface RegisterUseCaseOutput {
  userId: string;
  tenantId: string;
  role: UserRole;
}

/**
 * Cria uma nova clínica (Tenant) e seu primeiro usuário (OWNER) em
 * uma única transação atômica. Se qualquer passo falhar, nada persiste.
 *
 * Defesas:
 *  - Senha hasheada com Argon2id (nunca toca o banco em plaintext).
 *  - Email único por tenant (constraint no schema) — mas como cada
 *    register cria seu próprio tenant, na prática email é único global
 *    no primeiro signup; checamos antes para mensagem de erro clara.
 *  - Role do criador é forçado a OWNER (cliente NÃO controla esse campo).
 *  - Tudo dentro de uma $transaction para integridade.
 */
export async function registerUseCase(
  input: RegisterUseCaseInput,
): Promise<RegisterUseCaseOutput> {
  // Verifica unicidade global do email entre todos os tenants (UX clara).
  const existing = await prisma.user.findFirst({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError('E-mail já cadastrado');
  }

  if (await isPasswordBreached(input.password)) {
    throw new AppError('VALIDATION_ERROR', 'Esta senha já foi exposta em vazamentos de dados conhecidos. Escolha uma senha diferente.', 422);
  }

  const passwordHash = await passwordService.hash(input.password);
  const tenantSlug = await generateUniqueSlug(input.clinicName ?? input.name);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.clinicName ?? `Consultório ${input.name.split(' ')[0]}`,
        slug: tenantSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        passwordHash,
        name: input.name,
        whatsapp: input.whatsapp,
        city: input.city,
        state: input.state,
        specialty: input.specialty,
        role: UserRole.OWNER, // ← forçado pelo servidor, NUNCA vindo do cliente
      },
      select: { id: true, role: true },
    });

    return { tenantId: tenant.id, userId: user.id, role: user.role as UserRole };
  });

  await auditLogger.log({
    action: 'AUTH_REGISTER',
    tenantId: result.tenantId,
    userId: result.userId,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    metadata: { specialty: input.specialty }, // dado operacional, não PII
  });

  return result;
}

async function generateUniqueSlug(seed: string): Promise<string> {
  const base = seed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'clinica';

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const exists = await prisma.tenant.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error('Falha ao gerar slug único');
}
