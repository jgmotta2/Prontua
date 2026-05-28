import type { TenantPrisma } from '@config/prisma';
import { AppError } from '@shared/errors/app-error';

export interface UpdateReportInput {
  reportId: string;
  structuredReport: string;  // Markdown editado pelo profissional
}

/**
 * Atualiza o relatório estruturado antes da finalização.
 * Após isFinalized = true, o relatório é imutável.
 */
export async function updateReportUseCase(
  db: TenantPrisma,
  input: UpdateReportInput,
): Promise<{ id: string; updatedAt: Date }> {
  const existing = await db.voiceSessionReport.findUnique({
    where: { id: input.reportId },
    select: { isFinalized: true },
  });

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Prontuário não encontrado', 404);
  }

  if (existing.isFinalized) {
    throw new AppError(
      'REPORT_FINALIZED',
      'Prontuário já finalizado não pode ser editado.',
      409,
    );
  }

  if (!input.structuredReport.trim()) {
    throw new AppError('INVALID_INPUT', 'O conteúdo do prontuário não pode ser vazio.', 422);
  }

  const updated = await db.voiceSessionReport.update({
    where: { id: input.reportId },
    data: {
      structuredReport: input.structuredReport,
      pdfStorageKey: null,  // PDF anterior invalidado ao editar
    },
    select: { id: true, updatedAt: true },
  });

  return updated;
}
