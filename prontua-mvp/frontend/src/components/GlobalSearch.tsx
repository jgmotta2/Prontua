import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, CalendarDays } from 'lucide-react';
import { usePatients } from '@features/patients/hooks/usePatients';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data } = usePatients();

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const patients = q.length >= 1
    ? (data?.patients ?? []).filter((p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        p.whatsapp.includes(q),
      ).slice(0, 8)
    : [];

  const handleSelect = (id: string) => {
    navigate(`/pacientes/${id}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-ink/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-warm/20 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-warm">
          <Search className="h-4 w-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente, sessão..."
            className="flex-1 bg-transparent text-ink outline-none placeholder:text-muted/60 text-sm"
          />
          <button onClick={onClose} className="text-muted hover:text-ink transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resultados */}
        {q.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted">Digite o nome do paciente para buscar</p>
            <div className="mt-4 flex justify-center gap-4 text-[10px] text-muted/70">
              <span><kbd className="rounded border border-warm px-1.5 py-0.5 font-mono">N</kbd> Nova sessão</span>
              <span><kbd className="rounded border border-warm px-1.5 py-0.5 font-mono">P</kbd> Pacientes</span>
              <span><kbd className="rounded border border-warm px-1.5 py-0.5 font-mono">A</kbd> Agenda</span>
              <span><kbd className="rounded border border-warm px-1.5 py-0.5 font-mono">F</kbd> Financeiro</span>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted">Nenhum resultado para "<strong>{query}</strong>"</p>
          </div>
        ) : (
          <ul className="py-2 max-h-80 overflow-y-auto">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => handleSelect(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm/40 dark:hover:bg-warm/20 transition text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/10">
                    <User className="h-4 w-4 text-sage" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{p.fullName}</p>
                    {p.email && (
                      <p className="text-xs text-muted truncate">{p.email}</p>
                    )}
                  </div>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted shrink-0">
                    <CalendarDays className="h-3 w-3" />
                    Ver paciente
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
