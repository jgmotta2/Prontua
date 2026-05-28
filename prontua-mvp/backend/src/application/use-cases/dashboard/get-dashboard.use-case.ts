import type { TenantPrisma } from '@config/prisma';
import { Prisma } from '@prisma/client';

/**
 * Resumo executivo da clínica no momento da consulta.
 *
 * - 3 contadores de sessões (hoje / semana / mês)
 * - Faturamento pago no mês corrente
 * - Pendências em aberto
 * - Série temporal de 6 meses para o gráfico
 * - Agenda de hoje (ordenada por horário) com nome do paciente
 *
 * Toda query usa `db` (Prisma já com escopo de tenant injetado), portanto
 * é impossível esta rota retornar dado de outra clínica — o filtro
 * `tenantId` é forçado pela extensão em config/prisma.ts.
 */

export interface DashboardData {
  metrics: {
    sessionsToday: number;
    sessionsThisWeek: number;
    sessionsThisMonth: number;
    revenuePaidThisMonth: number;
    revenuePending: number;
  };
  revenueByMonth: Array<{ key: string; label: string; revenue: number }>;
  todayAgenda: Array<{
    id: string;
    scheduledAt: string;
    patientId: string;
    patientName: string;
    status: string;
    mode: string;
    durationMin: number;
    value: number;
  }>;
}

// ─── helpers de data (server-local; TODO: usar timezone do Tenant) ──────────
function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function endOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}
function startOfWeek(d: Date): Date {
  const n = startOfDay(d);
  const day = n.getDay(); // 0=Dom..6=Sáb
  const diff = day === 0 ? -6 : 1 - day; // semana ISO inicia na segunda
  n.setDate(n.getDate() + diff);
  return n;
}
function endOfWeek(d: Date): Date {
  const n = startOfWeek(d);
  n.setDate(n.getDate() + 6);
  return endOfDay(n);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function decToNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d.toString()) : 0;
}

const MONTH_LABELS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export async function getDashboardUseCase(db: TenantPrisma): Promise<DashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Contadores em paralelo
  const [sessionsToday, sessionsThisWeek, sessionsThisMonth] = await Promise.all([
    db.session.count({
      where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELED' } },
    }),
    db.session.count({
      where: { scheduledAt: { gte: weekStart, lte: weekEnd }, status: { not: 'CANCELED' } },
    }),
    db.session.count({
      where: { scheduledAt: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELED' } },
    }),
  ]);

  // Pagamentos
  const [paidThisMonth, pending] = await Promise.all([
    db.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
    }),
  ]);

  // Série de 6 meses (incluindo o corrente)
  const months: Array<{ start: Date; end: Date; key: string; label: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      start: startOfMonth(ref),
      end: endOfMonth(ref),
      key: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
      label: MONTH_LABELS_PT[ref.getMonth()]!,
    });
  }

  const monthlyAggregates = await Promise.all(
    months.map((m) =>
      db.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: m.start, lte: m.end } },
        _sum: { amount: true },
      }),
    ),
  );

  const revenueByMonth = months.map((m, i) => ({
    key: m.key,
    label: m.label,
    revenue: decToNum(monthlyAggregates[i]!._sum.amount),
  }));

  // Agenda de hoje (com nome do paciente)
  const today = await db.session.findMany({
    where: { scheduledAt: { gte: todayStart, lte: todayEnd } },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      mode: true,
      durationMin: true,
      value: true,
      patientId: true,
      patient: { select: { fullName: true } },
    },
  });

  return {
    metrics: {
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
      revenuePaidThisMonth: decToNum(paidThisMonth._sum.amount),
      revenuePending: decToNum(pending._sum.amount),
    },
    revenueByMonth,
    todayAgenda: today.map((s) => ({
      id: s.id,
      scheduledAt: s.scheduledAt.toISOString(),
      patientId: s.patientId,
      patientName: s.patient.fullName,
      status: s.status,
      mode: s.mode,
      durationMin: s.durationMin,
      value: decToNum(s.value),
    })),
  };
}
