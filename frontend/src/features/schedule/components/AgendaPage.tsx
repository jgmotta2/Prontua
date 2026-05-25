import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Clock, Video, MapPin } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAgenda, useUpdateSessionStatus } from '../hooks/useAgenda';
import { SessionFormModal } from './SessionFormModal';
import { formatBRL, formatTime } from '@lib/utils/format';
import type { SessionStatus } from '../api/agenda.api';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Concluída',
  CANCELED:  'Cancelada',
  NO_SHOW:   'Falta',
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-warm text-ink',
  CONFIRMED: 'bg-sage/15 text-sage-dark',
  COMPLETED: 'bg-sage/25 text-sage-dark',
  CANCELED:  'bg-terracotta/10 text-terracotta',
  NO_SHOW:   'bg-terracotta/15 text-terracotta',
};

const STATUS_OPTIONS: SessionStatus[] = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'];

function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function AgendaPage() {
  const [searchParams]       = useSearchParams();
  const defaultPatientId     = searchParams.get('patientId') ?? undefined;
  const today                = toDateStr(new Date());
  const [date, setDate]      = useState(today);
  const [showModal, setShowModal] = useState(!!defaultPatientId);
  const [statusOpen, setStatusOpen] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useAgenda(date);
  const updateStatus = useUpdateSessionStatus();

  const handleStatus = (id: string, status: SessionStatus) => {
    updateStatus.mutate({ id, status });
    setStatusOpen(null);
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Agenda</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
          <CalendarPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova sessão</span>
        </button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-soft p-3">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="p-1.5 rounded-lg hover:bg-cream transition text-muted hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 text-center">
          <p className="font-medium text-ink capitalize">{formatDateHeader(date)}</p>
        </div>

        <button
          onClick={() => setDate(addDays(date, 1))}
          className="p-1.5 rounded-lg hover:bg-cream transition text-muted hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {date !== today && (
          <button
            onClick={() => setDate(today)}
            className="text-xs font-medium text-sage hover:text-sage-dark transition px-3 py-1.5
                       border border-sage/20 rounded-lg"
          >
            Hoje
          </button>
        )}
      </div>

      {/* Sessions */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white animate-pulse shadow-soft" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
            <CalendarPlus className="h-5 w-5 text-sage-dark" strokeWidth={1.8} />
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold text-ink">Nenhuma sessão</h3>
          <p className="mt-1 text-sm text-muted">Agende uma sessão para este dia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-4"
            >
              {/* Time column */}
              <div className="w-14 shrink-0 text-center">
                <p className="text-base font-semibold text-ink">{formatTime(s.scheduledAt)}</p>
                <p className="text-xs text-muted">{s.durationMin}min</p>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{s.patient.fullName}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                  {s.mode === 'ONLINE' ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                  <span>{s.mode === 'ONLINE' ? 'Online' : 'Presencial'}</span>
                  <span>·</span>
                  <Clock className="h-3 w-3" />
                  <span>{s.durationMin}min</span>
                  <span>·</span>
                  <span>{formatBRL(s.value)}</span>
                </div>
              </div>

              {/* Status selector */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setStatusOpen(statusOpen === s.id ? null : s.id)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition hover:opacity-80 ${STATUS_COLOR[s.status] ?? 'bg-warm text-ink'}`}
                >
                  {STATUS_LABEL[s.status] ?? s.status}
                </button>

                {statusOpen === s.id && (
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-soft
                                  border border-sage/10 py-1 min-w-[140px]">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleStatus(s.id, opt)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-cream transition
                                   disabled:opacity-50"
                        disabled={updateStatus.isPending}
                      >
                        {STATUS_LABEL[opt]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SessionFormModal
          defaultDate={date}
          defaultPatientId={defaultPatientId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
