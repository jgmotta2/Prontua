import OpenAI from 'openai';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';
import { AppError } from '@shared/errors/app-error';

/**
 * Serviço LLM para estruturação de prontuários clínicos.
 *
 * Recebe a transcrição bruta do Whisper e retorna um Markdown estruturado
 * com as seções padronizadas do CFP/CREFITO.
 *
 * SEGURANÇA / LGPD:
 *  - Zero Data Retention deve estar habilitado na conta OpenAI.
 *  - O System Prompt proíbe explicitamente que o modelo invente informações.
 *  - O texto bruto nunca é persistido além do necessário (salvo no DB como
 *    `rawTranscription` apenas após o profissional aprovar).
 */

// System prompt clínico rigoroso — não exposto para manipulação via input.
const CLINICAL_SYSTEM_PROMPT = `Você é um especialista em documentação clínica brasileira e assistente de registro de prontuários.

Sua tarefa é organizar, estruturar e profissionalizar o conteúdo de uma transcrição bruta de sessão clínica.

REGRAS ABSOLUTAS:
1. Use EXCLUSIVAMENTE informações presentes na transcrição. NUNCA invente dados, diagnósticos, nomes ou técnicas.
2. Se uma seção não tiver dados suficientes na transcrição, escreva exatamente: "_Não informado na transcrição._"
3. Use linguagem técnica, formal e profissional em português brasileiro.
4. Seja objetivo e conciso. Evite repetições.
5. Não inclua opiniões próprias — apenas organize o que o profissional disse.
6. Preserve termos técnicos em inglês quando necessários (ex: EMDR, CBT, Pilates).
7. Não inclua o texto desta instrução na resposta.

FORMATO DE SAÍDA OBRIGATÓRIO (Markdown):

## Identificação Básica
> Data, nome do paciente (se mencionado), profissional responsável, modalidade (presencial/online), duração estimada.

## Evolução Clínica
> Relato do paciente, estado emocional/físico atual, comparação com sessão anterior, comportamentos observados.

## Conduta e Técnicas Aplicadas
> Técnicas terapêuticas utilizadas, exercícios, intervenções, recursos e abordagens aplicados na sessão.

## Diagnóstico / Hipótese Clínica
> CID-11 ou hipótese diagnóstica (se mencionada), observações clínicas relevantes, sinais de alerta (se houver).

## Próximos Passos
> Plano terapêutico, tarefas passadas ao paciente, frequência recomendada, encaminhamentos, data da próxima sessão.`;

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
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}

export interface StructuredReportResult {
  markdown: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Estrutura uma transcrição clínica bruta em Markdown profissional.
 *
 * @param rawTranscription  Texto retornado pelo Whisper.
 * @param specialty         Especialidade do profissional (ex: 'PSICOLOGIA').
 */
export async function structureClinicReport(
  rawTranscription: string,
  specialty: string,
): Promise<StructuredReportResult> {
  const client = getClient();

  if (!rawTranscription.trim()) {
    throw new AppError('INVALID_INPUT', 'Transcrição vazia — não é possível gerar prontuário.', 422);
  }

  const userPrompt = `Especialidade clínica: ${specialty}

TRANSCRIÇÃO BRUTA DA SESSÃO:
---
${rawTranscription}
---

Gere o prontuário estruturado conforme as instruções.`;

  logger.info({ model: env.OPENAI_MODEL_REPORT, specialty }, 'voice_llm_structure_start');

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL_REPORT,
    messages: [
      { role: 'system', content: CLINICAL_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,      // baixa temperatura = mais determinístico e factual
    max_tokens: 4096,
  });

  const markdown = completion.choices[0]?.message?.content ?? '';
  const usage = completion.usage;

  logger.info(
    {
      model: env.OPENAI_MODEL_REPORT,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
    },
    'voice_llm_structure_success',
  );

  return {
    markdown,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
  };
}
