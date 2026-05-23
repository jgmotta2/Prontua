import { env } from '@config/env';
import { prisma } from '@config/prisma';
import { logger } from '@shared/utils/logger';
import type { WhatsappKind } from '@prisma/client';

/**
 * Cliente Z-API para WhatsApp.
 *
 * REGRA CRÍTICA (Código de Ética CFP + LGPD):
 *  - Nenhum dado clínico, diagnóstico, observação de sessão ou
 *    informação sensível pode trafegar via WhatsApp.
 *  - As mensagens são restritas a 4 templates administrativos abaixo.
 *  - Templates usam apenas: primeiro nome, data/hora, valor.
 *  - Conteúdo de mensagem NÃO é persistido em WhatsappLog — apenas
 *    o tipo, status e ID externo.
 */

interface ScheduleConfirmInput {
  firstName: string;
  date: string;       // formatada: "amanhã, 14h"
  professionalName: string;
}

interface Reminder24hInput {
  firstName: string;
  date: string;
}

interface PaymentDueInput {
  firstName: string;
  amount: string;     // já formatada em BRL
}

interface WelcomeInput {
  firstName: string;
  professionalName: string;
}

const TEMPLATES = {
  SCHEDULE_CONFIRM: (i: ScheduleConfirmInput) =>
    `Olá, ${i.firstName}! Você tem um horário com ${i.professionalName} ${i.date}. ` +
    `Pode confirmar respondendo "OK"? 💚`,

  REMINDER_24H: (i: Reminder24hInput) =>
    `Oi, ${i.firstName}! Lembrete: sua sessão é ${i.date}. Até lá! 🙌`,

  PAYMENT_DUE: (i: PaymentDueInput) =>
    `Olá, ${i.firstName}! Identificamos um valor em aberto de ${i.amount}. ` +
    `Posso te enviar o link para pagamento?`,

  WELCOME: (i: WelcomeInput) =>
    `Olá, ${i.firstName}! Boas-vindas. Seu acompanhamento com ${i.professionalName} foi iniciado. ` +
    `Você receberá lembretes por aqui. ✨`,
} as const;

/**
 * Heurística de segurança: rejeita qualquer string que pareça conter
 * conteúdo clínico/médico antes de despachar. Defesa em profundidade
 * caso alguém modifique templates futuramente sem se atentar.
 */
const FORBIDDEN_PATTERNS = [
  /diagnóstic[oa]/i,
  /transtorn/i,
  /depressã/i,
  /ansiedad/i,
  /medicament/i,
  /receit/i,
  /prontuári/i,
  /sintom/i,
  /CID[- ]?\d/i,
  /\bF\d{2}\b/, // códigos CID-10 mentais
];

function assertClinicalSafe(text: string): void {
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(text)) {
      throw new Error(
        '[zapi] mensagem bloqueada por conter padrão clínico/sensível. ' +
        'Mensagens via WhatsApp devem ser estritamente administrativas.',
      );
    }
  }
}

export class ZApiService {
  private readonly baseUrl: string;

  constructor() {
    if (!env.ZAPI_INSTANCE_ID || !env.ZAPI_TOKEN || !env.ZAPI_CLIENT_TOKEN) {
      logger.warn('Z-API não configurada — envios serão simulados');
    }
    this.baseUrl = `${env.ZAPI_BASE_URL}/instances/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_TOKEN}`;
  }

  async sendScheduleConfirm(tenantId: string, phoneE164: string, patientId: string | null, input: ScheduleConfirmInput): Promise<void> {
    await this.dispatch(tenantId, patientId, 'SCHEDULE_CONFIRM', phoneE164, TEMPLATES.SCHEDULE_CONFIRM(input));
  }

  async sendReminder24h(tenantId: string, phoneE164: string, patientId: string | null, input: Reminder24hInput): Promise<void> {
    await this.dispatch(tenantId, patientId, 'REMINDER_24H', phoneE164, TEMPLATES.REMINDER_24H(input));
  }

  async sendPaymentDue(tenantId: string, phoneE164: string, patientId: string | null, input: PaymentDueInput): Promise<void> {
    await this.dispatch(tenantId, patientId, 'PAYMENT_DUE', phoneE164, TEMPLATES.PAYMENT_DUE(input));
  }

  async sendWelcome(tenantId: string, phoneE164: string, patientId: string | null, input: WelcomeInput): Promise<void> {
    await this.dispatch(tenantId, patientId, 'WELCOME', phoneE164, TEMPLATES.WELCOME(input));
  }

  /**
   * Único ponto de saída de mensagens. Garante:
   *  1. Validação anti-PHI do texto final
   *  2. Persistência do log com tenantId
   *  3. Tratamento uniforme de erros e status
   */
  private async dispatch(
    tenantId: string,
    patientId: string | null,
    kind: WhatsappKind,
    phoneE164: string,
    message: string,
  ): Promise<void> {
    assertClinicalSafe(message);

    const logEntry = await prisma.whatsappLog.create({
      data: { tenantId, patientId, kind, template: kind, status: 'QUEUED' },
    });

    try {
      const ok = await this.callZApi(phoneE164, message);
      await prisma.whatsappLog.update({
        where: { id: logEntry.id },
        data: { status: 'SENT', externalId: ok.id, sentAt: new Date() },
      });
    } catch (err) {
      await prisma.whatsappLog.update({
        where: { id: logEntry.id },
        data: { status: 'FAILED', error: (err as Error).message.slice(0, 500) },
      });
      throw err;
    }
  }

  private async callZApi(phone: string, message: string): Promise<{ id: string }> {
    if (!env.ZAPI_INSTANCE_ID || !env.ZAPI_TOKEN) {
      // Modo simulado em dev
      logger.info({ phone, length: message.length }, 'zapi_simulated_send');
      return { id: `sim_${Date.now()}` };
    }

    const res = await fetch(`${this.baseUrl}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': env.ZAPI_CLIENT_TOKEN!,
      },
      body: JSON.stringify({ phone, message }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Z-API ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { messageId?: string; id?: string };
    return { id: json.messageId ?? json.id ?? 'unknown' };
  }
}

export const zApiService = new ZApiService();
