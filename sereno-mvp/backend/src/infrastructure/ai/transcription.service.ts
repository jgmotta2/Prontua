import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';
import { AppError } from '@shared/errors/app-error';

/**
 * Serviço de transcrição de áudio via OpenAI Whisper.
 *
 * SEGURANÇA / LGPD:
 *  - Zero Data Retention: a OpenAI NÃO usa dados enviados via API para
 *    treinamento quando a conta tem ZDR habilitado no painel de API.
 *  - O arquivo de áudio é deletado do disco IMEDIATAMENTE após o upload
 *    para a API, independente de sucesso ou falha.
 *  - Nunca armazenamos o arquivo de áudio no banco ou em storage permanente.
 */

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!env.OPENAI_API_KEY) {
      throw new AppError(
        'CONFIG_ERROR',
        'OPENAI_API_KEY não configurada. Configure a variável de ambiente.',
        503,
      );
    }
    _client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      // Timeout de 5 minutos para arquivos grandes (100MB)
      timeout: 5 * 60 * 1000,
    });
  }
  return _client;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationSeconds?: number;
}

/**
 * Transcreve um arquivo de áudio e o deleta do disco imediatamente após.
 *
 * @param filePath  Caminho absoluto do arquivo temporário no servidor.
 * @param mimeType  MIME type do áudio (ex: 'audio/webm', 'audio/mpeg').
 * @param language  Idioma esperado — 'pt' para português (melhora acurácia).
 */
export async function transcribeAudio(
  filePath: string,
  mimeType: string,
  language = 'pt',
): Promise<TranscriptionResult> {
  const client = getClient();

  try {
    logger.info({ filePath: '[REDACTED]', mimeType }, 'voice_transcription_start');

    const stream = createReadStream(filePath);

    const response = await client.audio.transcriptions.create({
      file: stream,
      model: env.OPENAI_MODEL_TRANSCRIPTION,
      language,
      response_format: 'verbose_json',  // retorna metadados (duração, idioma)
      timestamp_granularities: [],
    } as any);

    const result: TranscriptionResult = {
      text: (response as any).text ?? '',
      language: (response as any).language,
      durationSeconds: (response as any).duration,
    };

    logger.info(
      {
        textLength: result.text.length,
        language: result.language,
        durationSeconds: result.durationSeconds,
      },
      'voice_transcription_success',
    );

    return result;
  } finally {
    // Deleção efêmera — SEMPRE executa, mesmo em caso de erro na API.
    // Garante que o áudio não persiste no servidor.
    try {
      await unlink(filePath);
      logger.info({}, 'voice_audio_ephemeral_deleted');
    } catch (unlinkErr) {
      // Logar como erro crítico — arquivo de saúde pode estar vazando no disco.
      logger.error({ err: unlinkErr }, 'voice_audio_delete_failed_CRITICAL');
    }
  }
}
