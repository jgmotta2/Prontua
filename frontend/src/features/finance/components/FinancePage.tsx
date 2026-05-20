import { useState } from 'react';
import { TrendingUp, Hourglass, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { usePayments, useFinanceSummary, useUpdatePayment } from '../hooks/useFinance';
import { formatBRL, formatFullDate } from '@lib/utils/format';
import type { PaymentMethod } from '../api/finance.api';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX:      'Pix',
  CARD:     'Cartão',
  CASH:     'Dinheiro',
  TRANSFER: 'Transferência',
  OTHER:    'Outro',
};

function currentMonth(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function last6Months(): string[] {
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const pad = (n: number) => String(n).padStart(2, '0');
    months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return months;
}

export function FinancePage() {
  const [month, setMonth] = useState(currentMonth);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('PIX');

  const { data: payments = [], isLoading: loadingPayments } = usePayments(month);
  const { data: summary, isLoading: loadingSummary } = useFinanceSummary(month);
  const updatePayment = useUpdatePayment();

  const handleMarkPaid = async (id: string) => {
    await updatePayment.mutateAsync({
      id,
      data: { status: 'PAID', method },
    });
    setMarkingId(null);
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Financeiro</h1>
          <p className="text-sm text-muted mt-1 capitalize">{monthLabel(month)}</p>
        </div>

        {/* Month selector */}
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input pr-8 appearance-none cursor-pointer text-sm py-2"
          >
            {last6Months().map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        </div>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loadingSummary ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white animate-pulse shadow-soft" />
          ))
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-soft p-5 flex items-start gap-4">
              <div className="rounded-xl bg-sage/15 p-2.5">
                <TrendingUp className="h-5 w-5 text-sage-dark" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">Recebido no mês</p>
                <p className="text-xl font-semibold text-ink mt-0.5">
                  {formatBRL(summary?.paidThisMonth.amount ?? 0)}
                </p>
                <p className="text-xs text-muted">{summary?.paidThisMonth.count ?? 0} pagamentos</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-soft p-5 flex items-start gap-4">
              <div className="rounded-xl bg-warm p-2.5">
                <Hourglass className="h-5 w-5 text-ink" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">A receber</p>
                <p className="text-xl font-semibold text-ink mt-0.5">
                  {formatBRL(summary?.pending.amount ?? 0)}
                </p>
                <p className="text-xs text-muted">{summary?.pending.count ?? 0} pendentes</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-soft p-5 flex items-start gap-4">
              <div className="rounded-xl bg-terracotta/10 p-2.5">
                <AlertTriangle className="h-5 w-5 text-terracotta" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">Em atraso</p>
                <p className="text-xl font-semibold text-ink mt-0.5">
                  {formatBRL(summary?.overdue.amount ?? 0)}
                </p>
                <p className="text-xs text-muted">{summary?.overdue.count ?? 0} em atraso</p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Payments list */}
      <section>
        <h2 className="font-display text-lg font-semibold text-ink mb-3">Pagamentos</h2>

        {loadingPayments ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white animate-pulse shadow-soft" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-sage/20 p-8 text-center text-sm text-muted">
            Nenhum pagamento neste período.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            {payments.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-4 py-3 ${idx !== 0 ? 'border-t border-sage/5' : ''}`}
              >
                {/* Status indicator */}
                <div className={`h-2 w-2 rounded-full shrink-0 ${p.status === 'PAID' ? 'bg-sage' : p.status === 'CANCELED' ? 'bg-muted' : 'bg-terracotta'}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{p.patient.fullName}</p>
                  <p className="text-xs text-muted">
                    {p.session ? formatFullDate(p.session.scheduledAt) : formatFullDate(p.createdAt)}
                    {p.method && ` · ${METHOD_LABELS[p.method]}`}
                    {p.paidAt && ` · pago em ${new Date(p.paidAt).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>

                <span className="text-sm font-semibold text-ink shrink-0">{formatBRL(p.amount)}</span>

                {p.status === 'PAID' ? (
                  <span className="flex items-center gap-1 text-xs text-sage-dark bg-sage/10 px-2 py-1 rounded-full shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    Pago
                  </span>
                ) : p.status === 'PENDING' ? (
                  markingId === p.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                        className="input text-xs py-1 px-2"
                      >
                        {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                          <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={updatePayment.isPending}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Confirmar
                      </button>
                      <button onClick={() => setMarkingId(null)} className="text-muted hover:text-ink text-xs">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setMarkingId(p.id)}
                      className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                    >
                      Marcar pago
                    </button>
                  )
                ) : (
                  <span className="text-xs text-muted shrink-0 capitalize">{p.status.toLowerCase()}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
