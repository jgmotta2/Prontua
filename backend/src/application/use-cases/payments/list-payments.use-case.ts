import type { TenantPrisma } from '@config/prisma';
import type { PaymentStatus } from '@prisma/client';

export interface ListPaymentsInput {
  status?: PaymentStatus;
  month?: string;
}

export async function listPaymentsUseCase(db: TenantPrisma, input: ListPaymentsInput) {
  let dateFilter: Record<string, Date> = {};

  if (input.month) {
    const [year, month] = input.month.split('-').map(Number);
    if (year && month) {
      dateFilter['gte'] = new Date(year, (month as number) - 1, 1, 0, 0, 0, 0);
      dateFilter['lte'] = new Date(year, month as number, 0, 23, 59, 59, 999);
    }
  }

  const payments = await db.payment.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, fullName: true } },
      session: { select: { id: true, scheduledAt: true, mode: true } },
    },
  });

  return { payments };
}
