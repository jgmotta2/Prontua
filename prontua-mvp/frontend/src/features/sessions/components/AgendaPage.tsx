import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, MapPin, Mic, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatBRL, formatTime } from '@lib/utils/format';
import { useSessions, useUpdateSessionStatus, type SessionItem } from '../hooks/useSessions';
import { SessionModal } from './SessionModal';

const STATUS_LABEL: Record<SessionItem['status'], string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
  NO_SHOW: 'Faltou',
};

const STATUS_STYLE: Record<SessionItem['status'], string> = {
  SCHEDULED: 'bg-warm text-ink/70',
  CONFIRMED: 'bg-sage/15 text-sage-dark',
  COMPLETED: 'bg-sage text-cream',
  CANCELED: 'bg-terracotta/15 text-terracotta',
  NO_SHOW: 'bg-terracotta/20 text-terracotta',
};

const NEXT_STATUS: Partial<Record<SessionItem['status'], SessionItem['status']>> = {
  SCHEDULED: 'CONFIRMED',
  CONFIRMED: 'COMPLETED',
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function AgendaPage() {
  const [currentDay, setCurrentDay] = useState(() => startOfDay(new Date()));
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useSessions(currentDay, endOfDay(currentDay));
  const updateStatus = useUpdateSessionStatus();

  const sessions = data?.sessions ?? [];

  function prevDay() {
    setCurrentDay((d) => new Date(d.getTime() - 86400000));
  }
  function nextDay() {
    setCurrentDay((d) => new Date(d.getTime() + 86400000));
  }
  function today() {
    setCurrentDay(startOfDay(new Date()));
  }

  const isToday = startOfDay(new Date()).getTime() === currentDay.getTime();

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-5">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Agenda</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova sessão</span>
        </button>
      </header>

      {/* Navegação de dia */}
      <div className="flex items-center gap-2">
        <button onClick={prevDay} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-warm/60 text-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-medium text-ink capitalize">{formatDayHeader(currentDay)}</p>
        </div>
        <button onClick={nextDay} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-warm/60 text-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isToday && (
          <button onClick={today} className="rounded-xl border border-sage/20 px-3 py-1.5 text-xs font-medium text-sage-dark hover:bg-sage/5">
            Hoje
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white animate-pulse shadow-soft" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sage/30 bg-sage/5 p-10 text-center">
          <p className="text-sm text-muted">Sem sessões para este dia.</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary mt-4">
            Agendar sessão
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-white px-4 py-3 shadow-soft"
            >
              <div className="min-w-[3.5rem]">
                <div className="font-display text-xl font-semibold leading-none text-sage-dark">
                  {formatTime(s.scheduledAt)}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {s.durationMin}min
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/pacientes/${s.patientId}`}
                  className="font-medium text-ink hover:text-sage-dark truncate block"
                >
                  {s.patientName}
                </Link>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted">
                  {s.mode === 'ONLINE' ? (
                    <Video className="h-3 w-3" strokeWidth={1.8} />
                  ) : (
                    <MapPin className="h-3 w-3" strokeWidth={1.8} />
                  )}
                  {s.mode === 'ONLINE' ? 'Online' : 'Presencial'} · {formatBRL(s.value)}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
                {NEXT_STATUS[s.status] && (
                  <button
                    onClick={() => updateStatus.mutate({ id: s.id, status: NEXT_STATUS[s.status]! })}
                    disabled={updateStatus.isPending}
                    className="rounded-xl border border-sage/20 px-2.5 py-1 text-[11px] font-medium text-sage-dark hover:bg-sage/5 disabled:opacity-50"
                  >
                    {NEXT_STATUS[s.status] === 'CONFIRMED' ? 'Confirmar' : 'Concluir'}
                  </button>
                )}
                {s.status !== 'CANCELED' && s.status !== 'NO_SHOW' && (
                  <>
                    <Link
                      to={`/pacientes/${s.patientId}/prontuario`}
                      className="flex items-center gap-1 rounded-xl border border-sage/20 px-2.5 py-1 text-[11px] font-medium text-sage-dark hover:bg-sage/5 transition"
                      title="Prontuário clínico"
                    >
                      <ClipboardList className="h-3 w-3" />
                      <span className="hidden sm:inline">Prontuário</span>
                    </Link>
                    <Link
                      to={`/agenda/${s.id}/prontuario-voz`}
                      state={{
                        patientId: s.patientId,
                        patientName: s.patientName,
                        scheduledAt: s.scheduledAt,
                      }}
                      className="flex items-center gap-1 rounded-xl border border-sage/20 px-2.5 py-1 text-[11px] font-medium text-sage-dark hover:bg-sage/5 transition"
                      title="Prontuário por voz (IA)"
                    >
                      <Mic className="h-3 w-3" />
                      <span className="hidden sm:inline">Prontuário por voz</span>
                    </Link>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <SessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={currentDay}
      />
    </div>
  );
}
