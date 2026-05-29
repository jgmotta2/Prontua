import type { TenantPrisma } from '@config/prisma';
import { Prisma } from '@prisma/client';
import type { PaymentStatus } from '@shared/constants/enums';

export interface PaymentListItem {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: string | null;
  paidAt: string | null;
  dueDate: string | null;
  patientId: string;
  patientName: string;
  sessionId: string | null;
  sessionScheduledAt: string | null;
  createdAt: string;
}

export async function listPaymentsUseCase(
  db: TenantPrisma,
  params: { status?: PaymentStatus; from?: Date; to?: Date },
): Promise<PaymentListItem[]> {
  const payments = await db.payment.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? { createdAt: { gte: params.from, lte: params.to } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      paidAt: true,
      dueDate: true,
      patientId: true,
      sessionId: true,
      createdAt: true,
      patient: { select: { fullName: true } },
      session: { select: { scheduledAt: true } },
    },
  });

  return payments.map((p) => ({
    id: p.id,
    amount: p.amount instanceof Prisma.Decimal ? Number(p.amount.toString()) : Number(p.amount),
    status: p.status as PaymentStatus,
    method: p.method ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
    dueDate: p.dueDate?.toISOString() ?? null,
    patientId: p.patientId,
    patientName: p.patient.fullName,
    sessionId: p.sessionId ?? null,
    sessionScheduledAt: p.session?.scheduledAt.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));
}
