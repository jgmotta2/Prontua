import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Loader2, Search, Printer, X, FileText } from 'lucide-react';
import { useSession } from '@features/auth/hooks/useSession';
import { formatBRL } from '@lib/utils/format';
import { usePatient } from '@features/patients/hooks/usePatients';
import { usePatientSessions, useSessionNote, useSaveNote } from '../hooks/useNotes';
import { SessionModal } from '@features/sessions/components/SessionModal';

const HUMOR_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Muito baixo' },
  { value: 2, emoji: '😕', label: 'Baixo' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Bem' },
  { value: 5, emoji: '😊', label: 'Excelente' },
];

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
  NO_SHOW: 'Faltou',
};

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: 'bg-warm text-ink/70',
  CONFIRMED: 'bg-sage/15 text-sage-dark',
  COMPLETED: 'bg-sage text-cream',
  CANCELED: 'bg-terracotta/15 text-terracotta',
  NO_SHOW: 'bg-terracotta/20 text-terracotta',
};

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const HUMOR_LABELS = ['', 'Muito baixo 😞', 'Baixo 😕', 'Regular 😐', 'Bem 🙂', 'Excelente 😊'];

export function ProntuarioPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const { data: patient } = usePatient(patientId ?? '');
  const { data: sessionInfo } = useSession();
  const { data: sessionsData, isLoading: sessionsLoading } = usePatientSessions(patientId ?? '');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Seleciona a primeira sessão ao carregar
  useEffect(() => {
    if (sessionsData?.sessions.length && !selectedSessionId) {
      setSelectedSessionId(sessionsData.sessions[0]?.id ?? null);
    }
  }, [sessionsData, selectedSessionId]);

  const { data: noteData, isLoading: noteLoading } = useSessionNote(selectedSessionId);
  const save = useSaveNote(selectedSessionId ?? '');

  const [humor, setHumor] = useState<number | null>(null);
  const [evolutionNote, setEvolutionNote] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Avisa antes de sair se há alterações não salvas
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveStatus]);

  useEffect(() => {
    if (noteData) {
      setHumor(noteData.humor);
      setEvolutionNote(noteData.evolutionNote);
      setNextSteps(noteData.nextSteps);
      setSaveStatus('idle');
    }
  }, [noteData]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback((payload: { humor: number | null; evolutionNote: string; nextSteps: string }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('saving');
    debounceRef.current = setTimeout(async () => {
      try {
        await save.mutateAsync({ technique: null, ...payload });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1200);
  }, [save]);

  const handleHumorChange = (h: number) => {
    const next = humor === h ? null : h;
    setHumor(next);
    triggerSave({ humor: next, evolutionNote, nextSteps });
  };

  const handleEvolutionChange = (v: string) => {
    setEvolutionNote(v);
    triggerSave({ humor, evolutionNote: v, nextSteps });
  };

  const handleNextStepsChange = (v: string) => {
    setNextSteps(v);
    triggerSave({ humor, evolutionNote, nextSteps: v });
  };

  const sessions = (sessionsData?.sessions ?? []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      formatShortDate(s.scheduledAt).toLowerCase().includes(q) ||
      STATUS_LABEL[s.status]?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full min-h-screen bg-cream">
      {/* ── Painel esquerdo: histórico ─────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-warm bg-white flex flex-col h-screen sticky top-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-warm">
          <Link
            to={`/pacientes/${patientId}`}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink transition mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {patient?.fullName ?? 'Paciente'}
          </Link>
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink text-sm">Histórico</h2>
            <div className="flex items-center gap-1">
              <Link
                to={`/pacientes/${patientId}/prontuario/exportar`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-warm px-2 py-1.5 text-xs text-muted hover:text-ink hover:border-sage/40 transition"
                title="Exportar prontuário completo"
              >
                <FileText className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setNewSessionOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-sage px-2.5 py-1.5 text-xs font-medium text-cream hover:bg-sage-dark transition"
              >
                <Plus className="h-3 w-3" />
                Nova
              </button>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="px-3 py-2 border-b border-warm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar sessão..."
              className="w-full rounded-lg border border-warm bg-cream/50 py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-muted/60 focus:border-sage focus:outline-none"
            />
          </div>
        </div>

        {/* Lista de sessões */}
        <ul className="flex-1 overflow-y-auto py-2">
          {sessionsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="mx-2 mb-2 h-16 rounded-xl bg-warm/40 animate-pulse" />
            ))
          ) : sessions.length === 0 ? (
            <li className="px-4 py-8 text-center text-xs text-muted">
              Nenhuma sessão registrada.
            </li>
          ) : (
            sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setSelectedSessionId(s.id);
                    setHumor(null);
                    setEvolutionNote('');
                    setNextSteps('');
                  }}
                  className={[
                    'w-full text-left px-4 py-3 transition',
                    selectedSessionId === s.id
                      ? 'bg-sage/10 border-l-2 border-sage'
                      : 'hover:bg-warm/40 border-l-2 border-transparent',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-ink">
                      {formatShortDate(s.scheduledAt)}
                    </span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[s.status] ?? 'bg-warm text-ink/70'}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted">
                    {formatSessionTime(s.scheduledAt)} · {s.durationMin}min · {s.mode === 'ONLINE' ? 'Online' : 'Presencial'} · {formatBRL(s.value)}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      {/* ── Painel direito: editor de nota ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {!selectedSessionId ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-muted text-sm">Selecione uma sessão para ver ou editar a evolução clínica.</p>
              {sessions.length === 0 && (
                <button onClick={() => setNewSessionOpen(true)} className="btn-primary mt-4">
                  <Plus className="h-4 w-4" />
                  Agendar primeira sessão
                </button>
              )}
            </div>
          </div>
        ) : noteLoading ? (
          <div className="space-y-4 animate-pulse max-w-2xl">
            <div className="h-6 w-72 rounded bg-warm/60" />
            <div className="h-4 w-48 rounded bg-warm/40" />
            <div className="h-32 rounded-xl bg-warm/30" />
            <div className="h-32 rounded-xl bg-warm/30" />
          </div>
        ) : noteData ? (
          <>
          {/* Modal de preview do prontuário */}
          {previewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-warm shrink-0">
                  <h3 className="font-display font-semibold text-ink">Preview do prontuário</h3>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/pacientes/${patientId}/prontuario/${selectedSessionId}/imprimir`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-xs font-medium text-cream hover:bg-sage-dark transition"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Abrir para imprimir
                    </Link>
                    <button onClick={() => setPreviewOpen(false)} className="text-muted hover:text-ink transition">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto p-6 space-y-4 text-sm">
                  <div className="border border-sage/20 rounded-lg p-3 text-[11px] text-muted leading-relaxed">
                    <strong>DOCUMENTO CONFIDENCIAL — PRONTUÁRIO CLÍNICO.</strong> Protegido pela LGPD (Lei nº 13.709/2018) e sigilo profissional.
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">Paciente</p>
                    <p className="font-semibold text-ink">{patient?.fullName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-cream/60 rounded-lg text-xs">
                    <div><span className="text-muted">Data: </span><span className="capitalize">{formatSessionDate(noteData.scheduledAt)}</span></div>
                    <div><span className="text-muted">Hora: </span>{formatSessionTime(noteData.scheduledAt)}</div>
                    <div><span className="text-muted">Duração: </span>{noteData.durationMin}min</div>
                    <div><span className="text-muted">Modalidade: </span>{noteData.mode === 'ONLINE' ? 'Online' : 'Presencial'}</div>
                  </div>
                  {noteData.humor !== null && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">Humor</p>
                      <p>{noteData.humor}/5 — {HUMOR_LABELS[noteData.humor]}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">Evolução clínica</p>
                    <p className="whitespace-pre-wrap text-ink/80 leading-relaxed min-h-[60px]">
                      {noteData.evolutionNote || <span className="text-muted italic">Sem registro.</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">Próximos passos</p>
                    <p className="whitespace-pre-wrap text-ink/80 leading-relaxed min-h-[40px]">
                      {noteData.nextSteps || <span className="text-muted italic">Sem registro.</span>}
                    </p>
                  </div>
                  {sessionInfo?.name && (
                    <p className="text-xs text-muted pt-2 border-t border-warm">Profissional: {sessionInfo.name}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="max-w-2xl space-y-6">
            {/* Header da sessão */}
            <div className="rounded-2xl bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[noteData.status] ?? 'bg-warm text-ink/70'}`}>
                      {STATUS_LABEL[noteData.status] ?? noteData.status}
                    </span>
                    {(() => {
                      const idx = sessions.findIndex((s) => s.id === selectedSessionId);
                      const num = sessions.length - idx;
                      return (
                        <span className="text-xs text-muted">Sessão {num} de {sessions.length}</span>
                      );
                    })()}
                  </div>
                  <p className="font-display text-lg font-semibold text-ink capitalize">
                    {formatSessionDate(noteData.scheduledAt)}
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    {formatSessionTime(noteData.scheduledAt)} · {noteData.durationMin}min · {noteData.mode === 'ONLINE' ? 'Online' : 'Presencial'} · {formatBRL(noteData.value)}
                  </p>
                </div>
                {/* Status do auto-save + botão imprimir */}
                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-xs text-muted flex items-center gap-1">
                    {saveStatus === 'saving' && (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</>
                    )}
                    {saveStatus === 'saved' && (
                      <><Check className="h-3 w-3 text-sage-dark" /> Salvo</>
                    )}
                    {saveStatus === 'idle' && 'Auto-save ativo'}
                  </span>
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-warm px-2.5 py-1 text-xs text-muted hover:text-ink hover:border-sage/40 transition"
                  >
                    <Printer className="h-3 w-3" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>

            {/* Humor */}
            <div className="rounded-2xl bg-white p-5 shadow-soft space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Humor do paciente</p>
              <div className="flex items-center gap-3">
                {HUMOR_OPTIONS.map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    onClick={() => handleHumorChange(value)}
                    title={label}
                    className={[
                      'flex flex-col items-center gap-0.5 rounded-xl p-2 transition',
                      humor === value ? 'bg-sage/15 ring-2 ring-sage' : 'hover:bg-warm/60',
                    ].join(' ')}
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                    <span className="text-[10px] text-muted">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Evolução clínica */}
            <div className="rounded-2xl bg-white p-5 shadow-soft space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Evolução clínica</p>
              <textarea
                value={evolutionNote}
                onChange={(e) => handleEvolutionChange(e.target.value)}
                rows={6}
                placeholder="Descreva o que foi trabalhado nesta sessão, observações clínicas, resposta do paciente..."
                className="w-full resize-y rounded-xl border border-warm bg-cream/50 px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage transition"
              />
            </div>

            {/* Próximos passos */}
            <div className="rounded-2xl bg-white p-5 shadow-soft space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Próximos passos</p>
              <textarea
                value={nextSteps}
                onChange={(e) => handleNextStepsChange(e.target.value)}
                rows={4}
                placeholder="- Tarefas para o paciente&#10;- Objetivos da próxima sessão&#10;- Pontos a acompanhar"
                className="w-full resize-y rounded-xl border border-warm bg-cream/50 px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage transition"
              />
            </div>
          </div>
          </>
        ) : null}
      </main>

      <SessionModal
        open={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        defaultPatientId={patientId}
      />
    </div>
  );
}
