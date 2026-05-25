import type { TenantPrisma } from '@config/prisma';
import { Prisma } from '@prisma/client';

export interface SessionListItem {
  id: string;
  scheduledAt: string;
  durationMin: number;
  mode: string;
  status: string;
  value: number;
  patientId: string;
  patientName: string;
  paymentStatus: string | null;
}

export async function listSessionsUseCase(
  db: TenantPrisma,
  params: { from: Date; to: Date },
): Promise<SessionListItem[]> {
  const sessions = await db.session.findMany({
    where: {
      scheduledAt: { gte: params.from, lte: params.to },
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      scheduledAt: true,
      durationMin: true,
      mode: true,
      status: true,
      value: true,
      patientId: true,
      patient: { select: { fullName: true } },
      payment: { select: { status: true } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    scheduledAt: s.scheduledAt.toISOString(),
    durationMin: s.durationMin,
    mode: s.mode,
    status: s.status,
    value: s.value instanceof Prisma.Decimal ? Number(s.value.toString()) : Number(s.value),
    patientId: s.patientId,
    patientName: s.patient.fullName,
    paymentStatus: s.payment?.status ?? null,
  }));
}
