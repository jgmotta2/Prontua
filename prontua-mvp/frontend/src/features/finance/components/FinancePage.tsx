import { useState } from 'react';
import { CheckCircle, Clock, TrendingUp, Download, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatBRL, formatTime } from '@lib/utils/format';
import { usePayments, useMarkPaid, type PaymentItem } from '../hooks/useFinance';

type Tab = 'PENDING' | 'PAID';

const METHOD_OPTIONS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CARD', label: 'Cartão' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'TRANSFER', label: 'Transferência' },
];

function PaymentCard({ payment, onPay }: { payment: PaymentItem; onPay: (id: string, method?: string) => void }) {
  const [method, setMethod] = useState('PIX');
  const isPaid = payment.status === 'PAID';

  return (
    <div className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-white px-4 py-3 shadow-soft">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isPaid ? 'bg-sage/10' : 'bg-terracotta/10'}`}>
        {isPaid ? (
          <CheckCircle className="h-5 w-5 text-sage-dark" strokeWidth={1.8} />
        ) : (
          <Clock className="h-5 w-5 text-terracotta" strokeWidth={1.8} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link to={`/pacientes/${payment.patientId}`} className="font-medium text-ink hover:text-sage-dark truncate block">
          {payment.patientName}
        </Link>
        <p className="text-xs text-muted mt-0.5">
          {payment.sessionScheduledAt
            ? `Sessão: ${formatTime(payment.sessionScheduledAt)}, ${new Date(payment.sessionScheduledAt).toLocaleDateString('pt-BR')}`
            : new Date(payment.createdAt).toLocaleDateString('pt-BR')}
          {isPaid && payment.paidAt && ` · Pago em ${new Date(payment.paidAt).toLocaleDateString('pt-BR')}`}
          {isPaid && payment.method && ` via ${METHOD_OPTIONS.find(m => m.value === payment.method)?.label ?? payment.method}`}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="font-display text-lg font-semibold text-ink">{formatBRL(payment.amount)}</span>
        {!isPaid && (
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded-xl border border-sage/20 bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-sage"
            >
              {METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => onPay(payment.id, method)}
              className="rounded-xl bg-sage px-3 py-1.5 text-xs font-medium text-cream hover:bg-sage-dark"
            >
              Recebido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function exportCSV(payments: PaymentItem[], tab: Tab) {
  const header = ['Paciente', 'Data da sessão', 'Valor', 'Status', 'Método', 'Pago em'];
  const rows = payments.map((p) => [
    p.patientName,
    p.sessionScheduledAt
      ? new Date(p.sessionScheduledAt).toLocaleDateString('pt-BR')
      : new Date(p.createdAt).toLocaleDateString('pt-BR'),
    p.amount.toFixed(2).replace('.', ','),
    p.status === 'PAID' ? 'Recebido' : 'Pendente',
    p.method ? (METHOD_OPTIONS.find(m => m.value === p.method)?.label ?? p.method) : '',
    p.paidAt ? new Date(p.paidAt).toLocaleDateString('pt-BR') : '',
  ]);

  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeiro-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinancePage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  const filter = {
    status: tab,
    from: dateFrom || undefined,
    to: dateTo ? dateTo + 'T23:59:59' : undefined,
  };

  const { data, isLoading } = usePayments(filter);
  const markPaid = useMarkPaid();
  const { data: allData } = usePayments();

  const allPayments = allData?.payments ?? [];
  const totalPending = allPayments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
  const totalPaid = allPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);

  const payments = (data?.payments ?? []).filter((p) =>
    patientSearch.trim()
      ? p.patientName.toLowerCase().includes(patientSearch.toLowerCase())
      : true,
  );
  const total = payments.reduce((s, p) => s + p.amount, 0);

  const hasFilters = dateFrom || dateTo || patientSearch;

  function handlePay(id: string, method?: string) {
    markPaid.mutate({ id, method });
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-5">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Financeiro</h1>
        <p className="text-sm text-muted mt-0.5">Controle de pagamentos das sessões</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">A receber</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta/10">
              <Clock className="h-4 w-4 text-terracotta" strokeWidth={1.8} />
            </span>
          </div>
          <div className="mt-4 font-display text-2xl sm:text-3xl font-semibold leading-tight text-ink">
            {formatBRL(totalPending)}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Total recebido</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/10">
              <TrendingUp className="h-4 w-4 text-sage-dark" strokeWidth={1.8} />
            </span>
          </div>
          <div className="mt-4 font-display text-2xl sm:text-3xl font-semibold leading-tight text-ink">
            {formatBRL(totalPaid)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-warm/40 p-1 gap-1">
        <button
          onClick={() => setTab('PENDING')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
            tab === 'PENDING' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          Pendente
        </button>
        <button
          onClick={() => setTab('PAID')}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
            tab === 'PAID' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          Recebido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input text-sm"
            title="De"
          />
          <span className="text-muted text-xs">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input text-sm"
            title="Até"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setPatientSearch(''); setDateFrom(''); setDateTo(''); }}
            className="text-xs text-muted hover:text-ink transition"
          >
            Limpar filtros
          </button>
        )}
        {payments.length > 0 && (
          <button
            onClick={() => exportCSV(payments, tab)}
            className="flex items-center gap-1.5 rounded-xl border border-sage/30 px-3 py-2 text-xs font-medium text-sage-dark hover:bg-sage/5 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white animate-pulse shadow-soft" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sage/30 bg-sage/5 p-10 text-center">
          <p className="text-sm text-muted">
            {hasFilters
              ? 'Nenhum pagamento encontrado para os filtros aplicados.'
              : tab === 'PENDING'
              ? 'Nenhum pagamento pendente. Bom trabalho!'
              : 'Nenhum pagamento recebido ainda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <PaymentCard key={p.id} payment={p} onPay={handlePay} />
          ))}
          <div className="flex justify-end pt-1">
            <span className="text-sm font-medium text-muted">
              {hasFilters && <span className="mr-2 text-xs">{payments.length} resultado{payments.length !== 1 ? 's' : ''} · </span>}
              Total: <span className="text-ink font-semibold ml-1">{formatBRL(total)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
