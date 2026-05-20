import type { TenantPrisma } from '@config/prisma';
import type { CreateSessionInput } from '@presentation/http/schemas/clinical.schema';
import { AppError } from '@shared/errors/app-error';

interface CreateSessionUseCaseInput extends CreateSessionInput {
  requestingUserId: string;
}

export async function createSessionUseCase(db: TenantPrisma, input: CreateSessionUseCaseInput) {
  // Block retroactive scheduling — compare against start of today (server time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (input.scheduledAt < today) {
    throw new AppError(
      'RETROACTIVE_DATE',
      'Não é permitido realizar agendamentos em datas retroativas.',
      400,
    );
  }

  const professionalId = input.professionalId ?? input.requestingUserId;

  const session = await db.session.create({
    data: {
      patientId:   input.patientId,
      professionalId,
      scheduledAt: input.scheduledAt,
      durationMin: input.durationMin,
      mode:        input.mode,
      value:       input.value,
    } as any,
  });

  // PENDING payment linked to the session — created after so it can reference session.id
  await db.payment.create({
    data: {
      patientId: input.patientId,
      sessionId: session.id,
      amount:    input.value,
      status:    'PENDING',
      dueDate:   input.scheduledAt,
    } as any,
  });

  return session;
}
