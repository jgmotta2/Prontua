import type { TenantPrisma } from '@config/prisma';
import { AppError } from '@shared/errors/app-error';

export interface VoiceReportDetail {
  id: string;
  sessionId: string;
  rawTranscription: string;
  structuredReport: string;
  isFinalized: boolean;
  hasPdf: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
  session: {
    scheduledAt: Date;
    patient: { fullName: string };
  };
}

export async function getReportUseCase(
  db: TenantPrisma,
  reportId: string,
): Promise<VoiceReportDetail> {
  const report = await db.voiceSessionReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      sessionId: true,
      rawTranscription: true,
      structuredReport: true,
      pdfStorageKey: true,
      isFinalized: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true } },
      session: {
        select: {
          scheduledAt: true,
          patient: { select: { fullName: true } },
        },
      },
    },
  });

  if (!report) {
    throw new AppError('NOT_FOUND', 'Prontuário de voz não encontrado', 404);
  }

  return {
    id: report.id,
    sessionId: report.sessionId,
    rawTranscription: report.rawTranscription,
    structuredReport: report.structuredReport,
    isFinalized: report.isFinalized,
    hasPdf: !!report.pdfStorageKey,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    author: report.author,
    session: report.session,
  };
}

/** Busca o relatório pelo ID da sessão (mais comum vindo do frontend). */
export async function getReportBySessionUseCase(
  db: TenantPrisma,
  sessionId: string,
): Promise<VoiceReportDetail | null> {
  const report = await db.voiceSessionReport.findFirst({
    where: { sessionId },
    select: {
      id: true,
      sessionId: true,
      rawTranscription: true,
      structuredReport: true,
      pdfStorageKey: true,
      isFinalized: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true } },
      session: {
        select: {
          scheduledAt: true,
          patient: { select: { fullName: true } },
        },
      },
    },
  });

  if (!report) return null;

  return {
    id: report.id,
    sessionId: report.sessionId,
    rawTranscription: report.rawTranscription,
    structuredReport: report.structuredReport,
    isFinalized: report.isFinalized,
    hasPdf: !!report.pdfStorageKey,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    author: report.author,
    session: report.session,
  };
}
