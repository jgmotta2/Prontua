import type { TenantPrisma } from '@config/prisma';
import { NotFoundError } from '@shared/errors/app-error';
import { zApiService } from '@infrastructure/messaging/zapi.service';

export type SessionNotificationType = 'SCHEDULE_CONFIRM' | 'REMINDER_24H';

export async function notifySessionUseCase(
  db: TenantPrisma,
  sessionId: string,
  tenantId: string,
  type: SessionNotificationType,
): Promise<void> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      patient:      { select: { fullName: true, whatsapp: true, id: true } },
      professional: { select: { name: true } },
    },
  });
  if (!session) throw new NotFoundError('Sessão');

  const firstName = session.patient.fullName.split(' ')[0]!;
  const phone     = session.patient.whatsapp;
  const patientId = session.patient.id;
  const dateLabel = session.scheduledAt.toLocaleString('pt-BR', {
    weekday:  'long',
    day:      'numeric',
    month:    'long',
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  if (type === 'SCHEDULE_CONFIRM') {
    await zApiService.sendScheduleConfirm(tenantId, phone, patientId, {
      firstName,
      date:             dateLabel,
      professionalName: session.professional.name,
    });
  } else {
    await zApiService.sendReminder24h(tenantId, phone, patientId, {
      firstName,
      date: dateLabel,
    });
  }
}
