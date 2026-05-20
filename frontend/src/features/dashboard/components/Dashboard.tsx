import { CalendarCheck, CalendarRange, TrendingUp, Hourglass, Wallet } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { formatBRL, formatFullDate } from '@lib/utils/format';
import { KpiCard, KpiCardSkeleton } from './KpiCard';
import { RevenueChart } from './RevenueChart';
import { TodayAgenda } from './TodayAgenda';

export function Dashboard() {
  const { data, isLoading, isError, error } = useDashboard();

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <header>
        <p className="text-xs sm:text-sm text-muted capitalize">{formatFullDate(new Date())}</p>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-ink mt-1 leading-tight">
          Olá, <span className="text-sage-dark">bem-vindo de volta</span>
        </h1>
        <p className="text-sm text-muted mt-1 hidden sm:block">
          Aqui está um resumo do que está acontecendo na sua clínica.
        </p>
      </header>

      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-sm text-terracotta"
        >
          Não conseguimos carregar o dashboard: {error?.message ?? 'tente recarregar a página.'}
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading || !data ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Sessões hoje"
              value={String(data.metrics.sessionsToday)}
              hint={data.metrics.sessionsToday === 0 ? 'nenhuma marcada' : 'agendadas para hoje'}
              icon={CalendarCheck}
              tone="sage"
            />
            <KpiCard
              label="Esta semana"
              value={String(data.metrics.sessionsThisWeek)}
              hint="sessões ativas"
              icon={CalendarRange}
              tone="sage"
            />
            <KpiCard
              label="Faturado no mês"
              value={formatBRL(data.metrics.revenuePaidThisMonth)}
              hint={`${data.metrics.sessionsThisMonth} sessões no mês`}
              icon={TrendingUp}
              tone="ink"
            />
            <KpiCard
              label="A receber"
              value={formatBRL(data.metrics.revenuePending)}
              hint="pagamentos em aberto"
              icon={Hourglass}
              tone="terracotta"
            />
          </>
        )}
      </section>

      {/* Conteúdo principal */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          {isLoading || !data ? (
            <div className="rounded-2xl bg-white p-5 shadow-soft h-72 sm:h-80 animate-pulse">
              <div className="h-4 w-32 rounded bg-warm/60" />
              <div className="mt-6 flex h-52 sm:h-56 items-end gap-2 sm:gap-3 px-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-warm/50"
                    style={{ height: `${30 + ((i * 17) % 60)}%` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <RevenueChart data={data.revenueByMonth} />
          )}
        </div>

        <div className="lg:col-span-2">
          {isLoading || !data ? (
            <div className="rounded-2xl bg-white p-5 shadow-soft h-72 sm:h-80 animate-pulse">
              <div className="h-4 w-32 rounded bg-warm/60" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-warm/40" />
                ))}
              </div>
            </div>
          ) : (
            <TodayAgenda agenda={data.todayAgenda} />
          )}
        </div>
      </section>

      {/* Empty state geral (nova conta sem dados) */}
      {data &&
        data.metrics.sessionsThisMonth === 0 &&
        data.metrics.revenuePaidThisMonth === 0 && (
          <section className="rounded-2xl border-2 border-dashed border-sage/30 bg-sage/5 p-5 sm:p-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage/15">
              <Wallet className="h-5 w-5 text-sage-dark" strokeWidth={1.8} />
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-ink">Vamos começar</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Cadastre seu primeiro paciente para começar a registrar sessões e ver seus
              números aparecerem aqui.
            </p>
            <a href="/pacientes" className="btn-primary mt-4 inline-flex">
              Cadastrar paciente
            </a>
          </section>
        )}
    </div>
  );
}
