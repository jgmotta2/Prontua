import type { TenantPrisma } from '@config/prisma';
import type { SessionStatus } from '@prisma/client';

export interface ListSessionsInput {
  date?: string;
  from?: string;
  to?: string;
  patientId?: string;
  status?: SessionStatus;
}

export async function listSessionsUseCase(db: TenantPrisma, input: ListSessionsInput) {
  let scheduledAtFilter: Record<string, Date> = {};

  if (input.date) {
    const d = new Date(input.date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    scheduledAtFilter = { gte: start, lte: end };
  } else {
    if (input.from) scheduledAtFilter['gte'] = new Date(input.from);
    if (input.to)   scheduledAtFilter['lte'] = new Date(input.to);
  }

  const sessions = await db.session.findMany({
    where: {
      ...(Object.keys(scheduledAtFilter).length ? { scheduledAt: scheduledAtFilter } : {}),
      ...(input.patientId ? { patientId: input.patientId } : {}),
      ...(input.status    ? { status:    input.status    } : {}),
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      scheduledAt: true,
      durationMin: true,
      mode: true,
      value: true,
      status: true,
      patientId: true,
      professionalId: true,
      patient:      { select: { fullName: true } },
      professional: { select: { name: true } },
      payment:      { select: { id: true, status: true, amount: true, method: true } },
    },
  });

  return {
    sessions: sessions.map((s) => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
      value:       Number(s.value),
      payment:     s.payment ? { ...s.payment, amount: Number(s.payment.amount) } : null,
    })),
  };
}
