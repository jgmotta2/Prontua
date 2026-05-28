import type { TenantPrisma } from '@config/prisma';
import { generateClinicalPdf, type ClinicalPdfOptions } from '@infrastructure/pdf/pdf.service';
import { AppError } from '@shared/errors/app-error';
import { logger } from '@shared/utils/logger';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface FinalizeReportInput {
  reportId: string;
  authorId: string;
}

export interface FinalizeReportOutput {
  reportId: string;
  pdfStorageKey: string;
  /** PDF como Buffer para stream imediato ao cliente */
  pdfBuffer: Buffer;
}

/**
 * Finaliza o prontuário:
 *  1. Valida que o relatório existe e não está finalizado
 *  2. Busca dados do profissional, clínica e paciente para o timbre
 *  3. Gera o PDF oficial via Puppeteer
 *  4. Salva o PDF em storage local temporário (MVP) ou S3 (produção)
 *  5. Marca isFinalized = true e registra a chave do PDF
 *
 * Após finalização, o relatório é IMUTÁVEL — conforme exigência do CFP.
 */
export async function finalizeReportUseCase(
  db: TenantPrisma,
  input: FinalizeReportInput,
): Promise<FinalizeReportOutput> {
  const { reportId, authorId } = input;

  // 1. Busca o relatório com todos os dados necessários para o PDF
  const report = await db.voiceSessionReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      structuredReport: true,
      isFinalized: true,
      author: {
        select: {
          id: true,
          name: true,
          registry: true,
          specialty: true,
          tenant: {
            select: {
              name: true,
            },
          },
        },
      },
      session: {
        select: {
          scheduledAt: true,
          patient: {
            select: { fullName: true },
          },
        },
      },
    },
  });

  if (!report) {
    throw new AppError('NOT_FOUND', 'Prontuário não encontrado', 404);
  }

  if (report.isFinalized) {
    throw new AppError(
      'REPORT_FINALIZED',
      'Este prontuário já foi finalizado.',
      409,
    );
  }

  // 2. Monta as opções do PDF
  const specialty = formatSpecialty(report.author.specialty);
  const registry = report.author.registry ?? 'Não informado';

  const pdfOptions: ClinicalPdfOptions = {
    professionalName: report.author.name,
    professionalRegistry: registry,
    specialty,
    clinicName: report.author.tenant.name,
    patientName: report.session.patient.fullName,
    sessionDate: report.session.scheduledAt,
    reportMarkdown: report.structuredReport,
  };

  logger.info({ reportId }, 'voice_finalize_pdf_start');

  // 3. Gera o PDF
  const pdfBuffer = await generateClinicalPdf(pdfOptions);

  // 4. Persiste o PDF em storage local (MVP)
  //    Em produção: substitua por upload para S3 e armazene a chave S3.
  const storageDir = join(process.cwd(), 'storage', 'pdfs');
  await mkdir(storageDir, { recursive: true });

  const fileName = `${randomUUID()}.pdf`;
  const filePath = join(storageDir, fileName);
  await writeFile(filePath, pdfBuffer);

  const pdfStorageKey = `pdfs/${fileName}`;

  // 5. Finaliza o relatório no banco — OPERAÇÃO IRREVERSÍVEL
  await db.voiceSessionReport.update({
    where: { id: reportId },
    data: {
      isFinalized: true,
      pdfStorageKey,
    },
  });

  logger.info({ reportId, pdfStorageKey }, 'voice_finalize_success');

  return {
    reportId,
    pdfStorageKey,
    pdfBuffer,
  };
}

/** Busca o PDF salvo em storage local (MVP). */
export async function getPdfBufferUseCase(
  db: TenantPrisma,
  reportId: string,
): Promise<{ buffer: Buffer; patientName: string }> {
  const report = await db.voiceSessionReport.findUnique({
    where: { id: reportId },
    select: {
      pdfStorageKey: true,
      isFinalized: true,
      session: { select: { patient: { select: { fullName: true } } } },
    },
  });

  if (!report) {
    throw new AppError('NOT_FOUND', 'Prontuário não encontrado', 404);
  }

  if (!report.isFinalized || !report.pdfStorageKey) {
    throw new AppError('REPORT_NOT_FINALIZED', 'PDF ainda não gerado. Finalize o prontuário primeiro.', 404);
  }

  const { readFile } = await import('fs/promises');
  const filePath = join(process.cwd(), 'storage', report.pdfStorageKey);

  try {
    const buffer = await readFile(filePath);
    return { buffer, patientName: report.session.patient.fullName };
  } catch {
    throw new AppError('PDF_NOT_FOUND', 'Arquivo PDF não encontrado no storage.', 404);
  }
}

function formatSpecialty(specialty: string): string {
  const map: Record<string, string> = {
    PSICOLOGIA: 'Psicologia',
    FISIOTERAPIA: 'Fisioterapia',
    FONOAUDIOLOGIA: 'Fonoaudiologia',
    PSICOPEDAGOGIA: 'Psicopedagogia',
    NUTRICAO: 'Nutrição',
    TERAPIA_OCUPACIONAL: 'Terapia Ocupacional',
    OUTRA: 'Saúde',
  };
  return map[specialty] ?? specialty;
}
