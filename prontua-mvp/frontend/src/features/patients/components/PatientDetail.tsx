import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Phone, Mail, CalendarDays, ClipboardList, Mic, Trash2, TrendingUp } from 'lucide-react';
import { formatBRL, formatFullDate } from '@lib/utils/format';
import { usePatient, useDeletePatient } from '../hooks/usePatients';
import { usePatientSessions, type SessionSummary } from '@features/notes/hooks/useNotes';
import { PatientModal } from './PatientModal';

const HUMOR_COLORS = ['', '#e56b6f', '#f4a261', '#e9c46a', '#57cc99', '#38a3a5'];
const HUMOR_LABELS = ['', 'Muito baixo', 'Baixo', 'Regular', 'Bem', 'Excelente'];

function MoodSparkline({ sessions }: { sessions: SessionSummary[] }) {
  const points = [...sessions].filter((s) => s.humor !== null).reverse().slice(-12);
  if (points.length < 2) return null;

  const W = 300;
  const H = 60;
  const pad = 8;
  const xStep = (W - pad * 2) / Math.max(points.length - 1, 1);

  const coords = points.map((s, i) => ({
    x: pad + i * xStep,
    y: H - pad - ((s.humor! - 1) / 4) * (H - pad * 2),
    humor: s.humor!,
    date: s.scheduledAt,
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 64 }}>
        <polyline
          points={polyline}
          fill="none"
          stroke="#7faf9b"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="4.5" fill={HUMOR_COLORS[c.humor]} stroke="#fff" strokeWidth="1.5">
            <title>{new Date(c.date).toLocaleDateString('pt-BR')} — {HUMOR_LABELS[c.humor]}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>{new Date(points[0]!.scheduledAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(points[points.length - 1]!.scheduledAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ name, onConfirm, onCancel, loading }: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/10">
            <Trash2 className="h-5 w-5 text-terracotta" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-ink">Excluir paciente</h3>
            <p className="text-xs text-muted">Esta ação não pode ser desfeita</p>
          </div>
        </div>
        <p className="text-sm text-ink/80">
          Tem certeza que deseja excluir <strong>{name}</strong>? Todas as sessões,
          prontuários e pagamentos vinculados serão removidos permanentemente.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-warm py-2 text-sm font-medium text-ink hover:bg-warm/40 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-terracotta py-2 text-sm font-medium text-white hover:bg-terracotta/90 transition disabled:opacity-50"
          >
            {loading ? 'Excluindo...' : 'Sim, excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading, isError } = usePatient(id ?? '');
  const { data: sessionsData } = usePatientSessions(id ?? '');
  const deletePatient = useDeletePatient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const lastSession = sessionsData?.sessions.find(
    (s) => s.status !== 'CANCELED' && s.status !== 'NO_SHOW',
  );

  const moodSessions = sessionsData?.sessions.filter((s) => s.humor !== null) ?? [];

  const handleDelete = async () => {
    if (!id) return;
    await deletePatient.mutateAsync(id);
    navigate('/pacientes', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-warm/60" />
        <div className="h-40 rounded-2xl bg-warm/40" />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-6 text-center text-sm text-terracotta">
          Paciente não encontrado.{' '}
          <Link to="/pacientes" className="underline">
            Voltar à lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Link to="/pacientes" className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-warm/60 text-muted shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink flex-1 min-w-0 truncate">
          {patient.fullName}
        </h1>
        <Link
          to={`/pacientes/${id}/prontuario`}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Prontuário
        </Link>
        {lastSession && (
          <Link
            to={`/agenda/${lastSession.id}/prontuario-voz`}
            state={{ patientId: id, patientName: patient.fullName, scheduledAt: lastSession.scheduledAt }}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            <Mic className="h-3.5 w-3.5" />
            Prontuário por voz
          </Link>
        )}
        <button onClick={() => setEditOpen(true)} className="btn-secondary flex items-center gap-2 text-sm py-2">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-terracotta/30 px-3 py-2 text-sm font-medium text-terracotta hover:bg-terracotta/5 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-soft space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-2xl font-semibold text-sage-dark">
            {formatBRL(patient.sessionValue)}
            <span className="font-sans text-sm font-normal text-muted ml-1">/ sessão</span>
          </span>
          {patient.frequencyTag && (
            <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-medium text-sage-dark">
              {patient.frequencyTag}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {patient.email && (
            <div className="flex items-center gap-2 text-muted">
              <Mail className="h-4 w-4 shrink-0" />
              <a href={`mailto:${patient.email}`} className="hover:text-ink truncate">
                {patient.email}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted">
            <Phone className="h-4 w-4 shrink-0" />
            <a href={`tel:${patient.whatsapp}`} className="hover:text-ink">
              {patient.whatsapp}
            </a>
          </div>
          {patient.birthDate && (
            <div className="flex items-center gap-2 text-muted">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {formatFullDate(patient.birthDate)}
            </div>
          )}
        </div>

        {patient.notesGeneral && (
          <div className="rounded-xl bg-warm/40 p-3 text-sm text-ink/80 whitespace-pre-wrap">
            {patient.notesGeneral}
          </div>
        )}
      </div>

      {/* Gráfico de evolução do humor */}
      {moodSessions.length >= 2 && (
        <div className="rounded-2xl bg-white p-5 shadow-soft space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-sage" strokeWidth={1.8} />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Evolução do humor</p>
          </div>
          <MoodSparkline sessions={sessionsData!.sessions} />
          <div className="flex items-center gap-3 flex-wrap">
            {[1,2,3,4,5].map((v) => (
              <span key={v} className="flex items-center gap-1 text-[10px] text-muted">
                <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: HUMOR_COLORS[v] }} />
                {HUMOR_LABELS[v]}
              </span>
            ))}
          </div>
        </div>
      )}

      <PatientModal open={editOpen} onClose={() => setEditOpen(false)} editing={patient} />

      {deleteOpen && (
        <DeleteConfirmModal
          name={patient.fullName}
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
          loading={deletePatient.isPending}
        />
      )}
    </div>
  );
}
