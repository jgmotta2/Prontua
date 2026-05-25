import type { TenantPrisma } from '@config/prisma';
import { transcribeAudio } from '@infrastructure/ai/transcription.service';
import { structureClinicReport } from '@infrastructure/ai/llm.service';
import { AppError } from '@shared/errors/app-error';
import { logger } from '@shared/utils/logger';

export interface UploadAudioInput {
  sessionId: string;
  authorId: string;
  /** Caminho absoluto do arquivo temporário. Será deletado pela transcribeAudio(). */
  tempFilePath: string;
  mimeType: string;
  /** Especialidade do profissional para guiar a LLM */
  specialty: string;
}

export interface UploadAudioOutput {
  reportId: string;
  rawTranscription: string;
  structuredReport: string;
}

/**
 * Pipeline de processamento de áudio clínico efêmero.
 *
 * Fluxo:
 *  1. Valida que a sessão existe e pertence ao tenant
 *  2. Valida que o paciente tem TCLE ativo
 *  3. Envia o áudio para Whisper (transcrição)
 *  4. Deleta o arquivo de áudio do disco (EFÊMERO — feito dentro do transcribeAudio)
 *  5. Envia a transcrição para GPT-4o (estruturação clínica)
 *  6. Persiste rawTranscription + structuredReport no banco
 *
 * O arquivo de áudio NUNCA sobrevive além do passo 4.
 */
export async function uploadAudioUseCase(
  db: TenantPrisma,
  input: UploadAudioInput,
): Promise<UploadAudioOutput> {
  const { sessionId, authorId, tempFilePath, mimeType, specialty } = input;

  // 1. Verifica que a sessão existe no tenant e é válida para gravação
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      patientId: true,
      status: true,
      voiceReport: { select: { id: true, isFinalized: true } },
    },
  });

  if (!session) {
    throw new AppError('NOT_FOUND', 'Sessão não encontrada', 404);
  }

  if (session.status === 'CANCELED' || session.status === 'NO_SHOW') {
    throw new AppError('INVALID_STATE', 'Não é possível gravar prontuário para sessão cancelada.', 422);
  }

  if (session.voiceReport?.isFinalized) {
    throw new AppError(
      'REPORT_FINALIZED',
      'Este prontuário já foi finalizado e não pode ser substituído.',
      409,
    );
  }

  // 2. Verifica consentimento ativo do paciente
  const consent = await db.patientConsent.findFirst({
    where: { patientId: session.patientId, active: true },
    select: { id: true, termVersion: true },
  });

  if (!consent) {
    throw new AppError(
      'CONSENT_REQUIRED',
      'Paciente não possui Termo de Consentimento Livre e Esclarecido ativo. ' +
        'Registre o consentimento antes de gravar.',
      403,
    );
  }

  // 3 + 4. Transcrição via Whisper + deleção efêmera do áudio
  logger.info({ sessionId, specialty }, 'voice_pipeline_start');

  const transcription = await transcribeAudio(tempFilePath, mimeType, 'pt');

  if (!transcription.text.trim()) {
    throw new AppError(
      'TRANSCRIPTION_EMPTY',
      'Não foi possível transcrever o áudio. Verifique a qualidade do microfone.',
      422,
    );
  }

  // 5. Estruturação clínica via LLM
  const { markdown } = await structureClinicReport(transcription.text, specialty);

  // 6. Persiste no banco (upsert: substitui rascunho anterior se houver)
  const existingReportId = session.voiceReport?.id;

  let reportId: string;

  if (existingReportId) {
    // Substitui rascunho anterior (só permitido se !isFinalized, checado acima)
    await db.voiceSessionReport.update({
      where: { id: existingReportId },
      data: {
        rawTranscription: transcription.text,
        structuredReport: markdown,
        pdfStorageKey: null,   // PDF anterior invalidado
        isFinalized: false,
      },
    });
    reportId = existingReportId;
  } else {
    const created = await db.voiceSessionReport.create({
      data: {
        sessionId,
        authorId,
        rawTranscription: transcription.text,
        structuredReport: markdown,
      },
      select: { id: true },
    });
    reportId = created.id;
  }

  logger.info({ reportId, sessionId }, 'voice_pipeline_success');

  return {
    reportId,
    rawTranscription: transcription.text,
    structuredReport: markdown,
  };
}
