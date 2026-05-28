import type { TenantPrisma } from '@config/prisma';
import { env } from '@config/env';

export interface ConsentStatus {
  hasActiveConsent: boolean;
  termVersion: string | null;
  agreedAt: Date | null;
  isCurrentVersion: boolean;  // false = TCLE foi atualizado, precisa renovar
}

/**
 * Verifica se um paciente possui TCLE ativo e na versão corrente.
 *
 * Usado pelo frontend para decidir se libera o botão de gravação.
 * A verificação é feita em tempo real no banco para garantir que
 * um consentimento revogado não permita gravação.
 */
export async function checkConsentUseCase(
  db: TenantPrisma,
  patientId: string,
): Promise<ConsentStatus> {
  const consent = await db.patientConsent.findFirst({
    where: { patientId, active: true },
    orderBy: { agreedAt: 'desc' },
    select: { termVersion: true, agreedAt: true },
  });

  if (!consent) {
    return {
      hasActiveConsent: false,
      termVersion: null,
      agreedAt: null,
      isCurrentVersion: false,
    };
  }

  return {
    hasActiveConsent: true,
    termVersion: consent.termVersion,
    agreedAt: consent.agreedAt,
    isCurrentVersion: consent.termVersion === env.TCLE_VERSION,
  };
}
