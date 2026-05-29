import type { TenantPrisma } from '@config/prisma';
import { prisma } from '@config/prisma';
import { env } from '@config/env';
import { hashIp } from '@infrastructure/security/hash.util';
import { AppError } from '@shared/errors/app-error';
import { logger } from '@shared/utils/logger';

export interface RecordConsentInput {
  patientId: string;
  professionalId: string;
  rawIp: string;           // IP bruto do dispositivo validador — será hashado
}

export interface RecordConsentOutput {
  consentId: string;
  termVersion: string;
  agreedAt: Date;
}

/**
 * Registra o Termo de Consentimento Livre e Esclarecido (TCLE) do paciente.
 *
 * Gera um log criptograficamente auditável contendo:
 *  - ID do Profissional que coletou o consentimento
 *  - ID do Paciente
 *  - Versão do texto legal aceito (controlada por env.TCLE_VERSION)
 *  - Hash SHA-256+pepper do IP do dispositivo (nunca o IP bruto)
 *  - Timestamp do servidor
 *
 * Se já existir um consentimento ativo para este paciente, ele é
 * revogado antes de criar o novo (renovação de TCLE).
 */
export async function recordConsentUseCase(
  db: TenantPrisma,
  input: RecordConsentInput,
): Promise<RecordConsentOutput> {
  const { patientId, professionalId, rawIp } = input;

  // Verifica se o paciente existe e pertence ao tenant
  const patient = await db.patient.findUnique({
    where: { id: patientId, deletedAt: null },
    select: { id: true, fullName: true },
  });
  if (!patient) throw new AppError('NOT_FOUND', 'Paciente não encontrado', 404);

  const ipHash = hashIp(rawIp);
  const termVersion = env.TCLE_VERSION;
  const now = new Date();

  // Usa o client direto do Prisma para tabelas não tenant-scoped-via-extension
  // (PatientConsent usa tenantId injetado pelo forTenant extension automaticamente)
  const consent = await db.$transaction(async (tx: any) => {
    // Revoga qualquer consentimento ativo anterior para este paciente
    await tx.patientConsent.updateMany({
      where: { patientId, active: true },
      data: { active: false, revokedAt: now },
    });

    // Cria o novo consentimento
    return tx.patientConsent.create({
      data: {
        patientId,
        recordedById: professionalId,
        termVersion,
        signedIpHash: ipHash,
        agreedAt: now,
        active: true,
      },
      select: { id: true, termVersion: true, agreedAt: true },
    });
  });

  logger.info(
    { consentId: consent.id, termVersion, patientId: '[REDACTED]' },
    'consent_recorded',
  );

  return {
    consentId: consent.id,
    termVersion: consent.termVersion,
    agreedAt: consent.agreedAt,
  };
}
