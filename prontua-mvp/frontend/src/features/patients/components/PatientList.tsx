import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Phone, Mail, AlertCircle } from 'lucide-react';
import { formatBRL } from '@lib/utils/format';
import { usePatients } from '../hooks/usePatients';
import { PatientModal } from './PatientModal';

export function PatientList() {
  const { data, isLoading, isError } = usePatients();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const patients = (data?.patients ?? []).filter((p) =>
    p.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Pacientes</h1>
          <p className="text-sm text-muted mt-0.5">
            {isLoading ? '...' : `${data?.patients.length ?? 0} paciente${data?.patients.length !== 1 ? 's' : ''} ativo${data?.patients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo paciente</span>
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          className="input pl-10"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isError && (
        <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-sm text-terracotta">
          Erro ao carregar pacientes. Tente recarregar a página.
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-5 shadow-soft animate-pulse h-32" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sage/30 bg-sage/5 p-10 text-center">
          <p className="text-sm text-muted">
            {search ? 'Nenhum paciente encontrado para essa busca.' : 'Nenhum paciente cadastrado ainda.'}
          </p>
          {!search && (
            <button onClick={() => setModalOpen(true)} className="btn-primary mt-4">
              Cadastrar primeiro paciente
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <Link
              key={p.id}
              to={`/pacientes/${p.id}`}
              className="rounded-2xl bg-white p-5 shadow-soft transition hover:shadow-md hover:-translate-y-0.5 block"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-ink truncate">{p.fullName}</p>
                    {p.hasOverduePayment && (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-terracotta" aria-label="Pagamento em atraso" />
                    )}
                  </div>
                  {p.frequencyTag && (
                    <span className="inline-block mt-1 rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-medium text-sage-dark">
                      {p.frequencyTag}
                    </span>
                  )}
                </div>
                <p className="shrink-0 font-display text-lg font-semibold text-sage-dark">
                  {formatBRL(p.sessionValue)}
                </p>
              </div>
              <div className="mt-3 space-y-1">
                {p.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {p.email}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Phone className="h-3 w-3 shrink-0" />
                  {p.whatsapp}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <PatientModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
