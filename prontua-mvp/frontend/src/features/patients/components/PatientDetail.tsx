import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Phone, Mail, CalendarDays, ClipboardList } from 'lucide-react';
import { formatBRL, formatFullDate } from '@lib/utils/format';
import { usePatient } from '../hooks/usePatients';
import { PatientModal } from './PatientModal';

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading, isError } = usePatient(id ?? '');
  const [editOpen, setEditOpen] = useState(false);

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
      <div className="flex items-center gap-3">
        <Link to="/pacientes" className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-warm/60 text-muted">
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
        <button onClick={() => setEditOpen(true)} className="btn-secondary flex items-center gap-2 text-sm py-2">
          <Pencil className="h-3.5 w-3.5" />
          Editar
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

      <PatientModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={patient}
      />
    </div>
  );
}
