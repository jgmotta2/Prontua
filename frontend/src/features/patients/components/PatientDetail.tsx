import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Phone, Mail, Calendar, Wallet, Clock, BookOpen } from 'lucide-react';
import { usePatient } from '../hooks/usePatients';
import { PatientFormModal } from './PatientFormModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api/client';
import { formatBRL, formatTime, formatFullDate } from '@lib/utils/format';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:  'Agendada',
  CONFIRMED:  'Confirmada',
  COMPLETED:  'Concluída',
  CANCELED:   'Cancelada',
  NO_SHOW:    'Falta',
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:  'bg-warm text-ink',
  CONFIRMED:  'bg-sage/15 text-sage-dark',
  COMPLETED:  'bg-sage/25 text-sage-dark font-medium',
  CANCELED:   'bg-terracotta/10 text-terracotta',
  NO_SHOW:    'bg-terracotta/15 text-terracotta',
};

interface SessionEntry {
  id: string;
  scheduledAt: string;
  durationMin: number;
  mode: string;
  value: number;
  status: string;
  payment: { status: string; amount: number } | null;
}

export function PatientDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [editing, setEditing] = useState(false);

  const { data: patient, isLoading, isError } = usePatient(id!);

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'patient', id],
    queryFn:  () => api.get<{ sessions: SessionEntry[] }>(`/sessions?patientId=${id}`),
    enabled:  !!id,
  });

  const sessions = sessionsData?.sessions ?? [];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white animate-pulse shadow-soft" />
        ))}
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div role="alert" className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-sm text-terracotta">
          Não foi possível carregar o paciente.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pacientes')} className="text-muted hover:text-ink transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold text-ink truncate">{patient.fullName}</h1>
        </div>
        <Link
          to={`/pacientes/${id}/prontuario`}
          className="btn-secondary gap-1.5 text-sm py-2 px-4"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Prontuário
        </Link>
        <button onClick={() => setEditing(true)} className="btn-secondary gap-1.5 text-sm py-2 px-4">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl shadow-soft p-5 space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          {patient.whatsapp && (
            <a
              href={`https://wa.me/${patient.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-sage transition"
            >
              <Phone className="h-3.5 w-3.5" />
              {patient.whatsapp}
            </a>
          )}
          {(patient as any).email && (
            <a href={`mailto:${(patient as any).email}`} className="flex items-center gap-1.5 hover:text-sage transition">
              <Mail className="h-3.5 w-3.5" />
              {(patient as any).email}
            </a>
          )}
          {(patient as any).birthDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date((patient as any).birthDate).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-sage/10">
          <div className="flex items-center gap-1.5 text-sm">
            <Wallet className="h-3.5 w-3.5 text-muted" />
            <span className="font-medium text-ink">{formatBRL(patient.sessionValue)}</span>
            <span className="text-muted">/ sessão</span>
          </div>
          {patient.frequencyTag && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-sage/15 text-sage-dark font-medium">
              {patient.frequencyTag}
            </span>
          )}
        </div>

        {(patient as any).notesGeneral && (
          <p className="text-sm text-muted pt-1 border-t border-sage/10 italic">
            {(patient as any).notesGeneral}
          </p>
        )}
      </div>

      {/* Sessions list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-ink">Sessões</h2>
          <Link
            to={`/agenda?patientId=${id}`}
            className="text-sm text-sage hover:text-sage-dark transition font-medium"
          >
            Nova sessão
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-sage/20 p-6 text-center text-sm text-muted">
            Nenhuma sessão registrada.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink">
                      {formatFullDate(s.scheduledAt)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? 'bg-warm text-ink'}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(s.scheduledAt)} · {s.durationMin}min
                    </span>
                    <span>{s.mode === 'ONLINE' ? 'Online' : 'Presencial'}</span>
                    <span>{formatBRL(s.value)}</span>
                  </div>
                </div>
                {s.payment && (
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${s.payment.status === 'PAID' ? 'bg-sage/15 text-sage-dark' : 'bg-terracotta/10 text-terracotta'}`}>
                    {s.payment.status === 'PAID' ? 'Pago' : 'Pendente'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && <PatientFormModal patient={patient} onClose={() => setEditing(false)} />}
    </div>
  );
}
