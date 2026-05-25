import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, ChevronRight, Phone } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import { PatientFormModal } from './PatientFormModal';
import { formatBRL } from '@lib/utils/format';

const FREQUENCY_COLORS: Record<string, string> = {
  Semanal:   'bg-sage/15 text-sage-dark',
  Quinzenal: 'bg-warm text-ink',
  Mensal:    'bg-terracotta/10 text-terracotta',
};

export function PatientList() {
  const { data: patients, isLoading, isError, error } = usePatients();
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const filtered = (patients ?? []).filter((p) =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.whatsapp.includes(search),
  );

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Pacientes</h1>
          <p className="text-sm text-muted mt-1">
            {patients ? `${patients.length} cadastrado${patients.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo paciente</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="search"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {isError && (
        <div role="alert" className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-sm text-terracotta">
          Não foi possível carregar os pacientes: {error?.message}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white animate-pulse shadow-soft" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
            <UserPlus className="h-5 w-5 text-sage-dark" strokeWidth={1.8} />
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold text-ink">
            {search ? 'Nenhum resultado' : 'Nenhum paciente ainda'}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {search ? 'Tente outro termo de busca.' : 'Clique em "Novo paciente" para começar.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((patient) => (
            <button
              key={patient.id}
              onClick={() => navigate(`/pacientes/${patient.id}`)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-soft hover:shadow-md
                         transition flex items-center gap-4 group"
            >
              {/* Avatar */}
              <div className="h-10 w-10 shrink-0 rounded-full bg-sage/15 flex items-center justify-center
                              text-sage-dark font-semibold text-sm">
                {patient.fullName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink truncate">{patient.fullName}</span>
                  {patient.frequencyTag && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQUENCY_COLORS[patient.frequencyTag] ?? 'bg-warm text-ink'}`}>
                      {patient.frequencyTag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted">
                  <Phone className="h-3 w-3" />
                  <span>{patient.whatsapp}</span>
                  <span className="mx-1">·</span>
                  <span>{formatBRL(patient.sessionValue)}/sessão</span>
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted group-hover:text-ink transition shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showModal && <PatientFormModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
