import type { TenantPrisma } from '@config/prisma';
import { NotFoundError } from '@shared/errors/app-error';
import type { CreateSessionInput } from '@presentation/http/schemas/clinical.schema';
import { Prisma } from '@prisma/client';

export async function createSessionUseCase(
  db: TenantPrisma,
  input: CreateSessionInput,
): Promise<{ sessionId: string; paymentId: string }> {
  const patient = await db.patient.findUnique({
    where: { id: input.patientId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) throw new NotFoundError('Paciente');

  const result = await db.$transaction(async (tx: any) => {
    const session = await tx.session.create({
      data: {
        patientId: input.patientId,
        professionalId: input.professionalId,
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin,
        mode: input.mode,
        value: new Prisma.Decimal(input.value),
        status: 'SCHEDULED',
      },
      select: { id: true },
    });

    const payment = await tx.payment.create({
      data: {
        patientId: input.patientId,
        sessionId: session.id,
        amount: new Prisma.Decimal(input.value),
        status: 'PENDING',
        dueDate: input.scheduledAt,
      },
      select: { id: true },
    });

    return { sessionId: session.id, paymentId: payment.id };
  });

  return result;
}
