import type { TenantPrisma } from '@config/prisma';
import { Prisma } from '@prisma/client';

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d.toString()) : 0;
}

export interface FinanceSummaryInput {
  month?: string;
}

export async function getFinanceSummaryUseCase(db: TenantPrisma, input: FinanceSummaryInput) {
  const now = new Date();
  let year  = now.getFullYear();
  let month = now.getMonth() + 1;

  if (input.month) {
    const parts = input.month.split('-').map(Number);
    if (parts[0] && parts[1]) { year = parts[0]; month = parts[1]; }
  }

  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd   = new Date(year, month,     0, 23, 59, 59, 999);

  const [paid, pending, overdue] = await Promise.all([
    db.payment.aggregate({
      where:  { status: 'PAID', paidAt: { gte: monthStart, lte: monthEnd } },
      _sum:   { amount: true },
      _count: true,
    }),
    db.payment.aggregate({
      where:  { status: 'PENDING' },
      _sum:   { amount: true },
      _count: true,
    }),
    db.payment.aggregate({
      where:  { status: 'PENDING', dueDate: { lt: now } },
      _sum:   { amount: true },
      _count: true,
    }),
  ]);

  return {
    paidThisMonth: { amount: toNum(paid._sum.amount),    count: paid._count    },
    pending:       { amount: toNum(pending._sum.amount),  count: pending._count  },
    overdue:       { amount: toNum(overdue._sum.amount),  count: overdue._count  },
  };
}
