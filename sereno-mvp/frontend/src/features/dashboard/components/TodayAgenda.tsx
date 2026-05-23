import { CalendarDays, Video, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTime } from '@lib/utils/format';
import type { DashboardData } from '../hooks/useDashboard';

interface Props {
  agenda: DashboardData['todayAgenda'];
}

type Status = DashboardData['todayAgenda'][number]['status'];

const STATUS_LABEL: Record<Status, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
  NO_SHOW: 'Faltou',
};

const STATUS_SHORT: Record<Status, string> = {
  SCHEDULED: 'Ag.',
  CONFIRMED: 'Conf.',
  COMPLETED: 'OK',
  CANCELED: 'Cancel.',
  NO_SHOW: 'Faltou',
};

const STATUS_STYLE: Record<Status, string> = {
  SCHEDULED: 'bg-warm text-ink/70',
  CONFIRMED: 'bg-sage/15 text-sage-dark',
  COMPLETED: 'bg-sage text-cream',
  CANCELED: 'bg-terracotta/15 text-terracotta',
  NO_SHOW: 'bg-terracotta/20 text-terracotta',
};

export function TodayAgenda({ agenda }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-ink">Agenda de hoje</h3>
          <p className="text-xs text-muted mt-0.5">
            {agenda.length === 0
              ? 'Sem compromissos hoje'
              : `${agenda.length} ${agenda.length === 1 ? 'sessão' : 'sessões'}`}
          </p>
        </div>
        <Link
          to="/agenda"
          className="shrink-0 text-xs font-medium text-sage hover:text-sage-dark whitespace-nowrap"
        >
          Ver agenda →
        </Link>
      </div>

      {agenda.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warm">
            <CalendarDays className="h-5 w-5 text-muted" strokeWidth={1.5} />
          </div>
          <p className="mt-3 text-sm text-muted">
            Você não tem sessões marcadas para hoje.
          </p>
          <Link
            to="/agenda"
            className="mt-2 text-xs font-medium text-sage hover:text-sage-dark"
          >
            Agendar uma sessão
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {agenda.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 sm:gap-4 rounded-xl border border-warm/40 px-3 sm:px-4 py-3
                         transition hover:border-sage/30 hover:bg-cream/40 active:bg-cream/60"
            >
              <div className="min-w-[3rem] sm:min-w-[3.5rem]">
                <div className="font-display text-lg sm:text-xl font-semibold leading-none text-sage-dark">
                  {formatTime(s.scheduledAt)}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {s.durationMin}min
                </div>
              </div>

              <Link
                to={`/pacientes/${s.patientId}`}
                className="flex-1 min-w-0 truncate font-medium text-ink hover:text-sage-dark"
              >
                {s.patientName}
              </Link>

              {/* Modo: só ícone em mobile, ícone+texto em desktop */}
              <span
                className="hidden sm:flex items-center gap-1 text-xs text-muted shrink-0"
                aria-label={s.mode === 'ONLINE' ? 'Online' : 'Presencial'}
              >
                {s.mode === 'ONLINE' ? (
                  <>
                    <Video className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Online
                  </>
                ) : (
                  <>
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Presencial
                  </>
                )}
              </span>
              <span className="sm:hidden shrink-0 text-muted" aria-hidden>
                {s.mode === 'ONLINE' ? (
                  <Video className="h-3.5 w-3.5" strokeWidth={1.8} />
                ) : (
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                )}
              </span>

              {/* Status: label abreviado em mobile, completo em desktop */}
              <span
                className={`shrink-0 rounded-full px-2 sm:px-2.5 py-1 text-[10px] font-medium ${STATUS_STYLE[s.status]}`}
              >
                <span className="hidden sm:inline">{STATUS_LABEL[s.status]}</span>
                <span className="sm:hidden">{STATUS_SHORT[s.status]}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
