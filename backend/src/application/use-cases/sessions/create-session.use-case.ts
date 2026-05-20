import type { TenantPrisma } from '@config/prisma';
import type { CreateSessionInput } from '@presentation/http/schemas/clinical.schema';

interface CreateSessionUseCaseInput extends CreateSessionInput {
  requestingUserId: string;
}

export async function createSessionUseCase(db: TenantPrisma, input: CreateSessionUseCaseInput) {
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
