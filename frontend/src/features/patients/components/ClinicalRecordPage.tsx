import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  Share2,
  Clock,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Smile,
  Frown,
  Meh,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatients';
import { useClinicalTimeline, useUpsertNote } from '../hooks/useNotes';
import { notesApi } from '../api/notes.api';
import type { TimelineEntry, UpsertNoteData } from '../api/notes.api';
import { formatBRL, formatFullDate, formatTime } from '@lib/utils/format';

// ── Constants ─────────────────────────────────────────────────────────────────

const TECHNIQUES = ['TCC', 'ACT', 'EMDR', 'DBT', 'Psicanálise', 'Gestalt', 'Sistêmica', 'Outra'];

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

// ── Mood picker ───────────────────────────────────────────────────────────────

const MOOD_CONFIG = [
  { value: 1, label: 'Muito triste',   icon: Frown,  color: 'text-terracotta' },
  { value: 2, label: 'Triste',         icon: Frown,  color: 'text-terracotta/70' },
  { value: 3, label: 'Neutro',         icon: Meh,    color: 'text-muted' },
  { value: 4, label: 'Bem',            icon: Smile,  color: 'text-sage' },
  { value: 5, label: 'Muito bem',      icon: Smile,  color: 'text-sage-dark' },
];

function MoodPicker({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {MOOD_CONFIG.map(({ value: v, label, icon: Icon, color }) => (
        <button
          key={v}
          type="button"
          title={label}
          onClick={() => onChange(v)}
          className={`rounded-lg p-1.5 transition ${
            value === v ? `${color} bg-sage/10 ring-1 ring-sage/30` : 'text-muted/40 hover:text-muted'
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={value === v ? 2.5 : 1.5} />
        </button>
      ))}
      {value && (
        <span className="ml-1 text-xs text-muted">{MOOD_CONFIG[value - 1]?.label}</span>
      )}
    </div>
  );
}

// ── Evolution Card ────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function EvolutionCard({
  entry,
  index,
  total,
  patientId,
}: {
  entry:    TimelineEntry;
  index:    number;
  total:    number;
  patientId: string;
}) {
  const upsert = useUpsertNote(patientId);

  const [content,   setContent]   = useState(entry.note?.content   ?? '');
  const [nextSteps, setNextSteps] = useState(entry.note?.nextSteps  ?? '');
  const [technique, setTechnique] = useState(entry.note?.techniqueUsed ?? '');
  const [mood,      setMood]      = useState<number | undefined>(entry.note?.patientMood ?? undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent re-fetches data
  useEffect(() => {
    setContent(entry.note?.content   ?? '');
    setNextSteps(entry.note?.nextSteps  ?? '');
    setTechnique(entry.note?.techniqueUsed ?? '');
    setMood(entry.note?.patientMood ?? undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.note?.updatedAt]);

  const scheduleAutoSave = useCallback(
    (c: string, ns: string, t: string, m: number | undefined) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaveStatus('idle');

      // Skip if nothing meaningful to save
      if (!c.trim() && !ns.trim() && !t.trim() && m == null) return;

      timerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        const data: UpsertNoteData = {};
        if (c !== undefined) data.content      = c;
        if (ns !== undefined) data.nextSteps   = ns;
        if (t !== undefined)  data.techniqueUsed = t;
        if (m != null)        data.patientMood  = m;

        try {
          await upsert.mutateAsync({ sessionId: entry.sessionId, data });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
          setSaveStatus('error');
        }
      }, 2000);
    },
    [entry.sessionId, upsert],
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleContent   = (v: string) => { setContent(v);   scheduleAutoSave(v, nextSteps, technique, mood); };
  const handleNextSteps = (v: string) => { setNextSteps(v); scheduleAutoSave(content, v, technique, mood); };
  const handleTechnique = (v: string) => { setTechnique(v); scheduleAutoSave(content, nextSteps, v, mood); };
  const handleMood      = (v: number) => { setMood(v);      scheduleAutoSave(content, nextSteps, technique, v); };

  return (
    <article
      className="rounded-2xl border border-sage/10 bg-white shadow-soft overflow-hidden"
      style={{ borderLeft: '3px solid #6B8E7F' }}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 px-5 py-4 bg-[#FDFCF0] border-b border-sage/10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-ink text-sm">
              Sessão {total - index}
            </span>
            <span className="text-muted text-xs">·</span>
            <span className="text-sm text-ink">{formatFullDate(entry.scheduledAt)}</span>
            <span className="text-muted text-xs">·</span>
            <span className="text-sm text-muted">{formatTime(entry.scheduledAt)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted">
            <span>{entry.professional.name}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{entry.durationMin}min
            </span>
            <span>·</span>
            <span>{entry.mode === 'ONLINE' ? 'Online' : 'Presencial'}</span>
            <span>·</span>
            <span>{formatBRL(entry.value)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[entry.status] ?? 'bg-warm text-ink'}`}>
            {STATUS_LABEL[entry.status] ?? entry.status}
          </span>
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />Salvando
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-sage-dark flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />Salvo
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-terracotta flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />Erro ao salvar
            </span>
          )}
        </div>
      </div>

      {/* Technique + Mood row */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-sage/10 bg-[#FDFCF0]/50">
        {/* Technique chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted mr-1">Técnica:</span>
          {TECHNIQUES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTechnique(technique === t ? '' : t)}
              className={`text-xs px-2 py-0.5 rounded-full border transition ${
                technique === t
                  ? 'bg-sage text-cream border-sage'
                  : 'bg-white border-sage/20 text-muted hover:border-sage/40 hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Mood */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Humor:</span>
          <MoodPicker value={mood} onChange={handleMood} />
        </div>
      </div>

      {/* Content area */}
      <div className="p-5 space-y-4">
        {/* Clinical evolution */}
        <div>
          <label className="block text-xs font-semibold text-ink/70 mb-1.5 uppercase tracking-wider">
            Evolução clínica
          </label>
          <textarea
            value={content}
            onChange={(e) => handleContent(e.target.value)}
            placeholder="Descreva a evolução da sessão..."
            rows={6}
            className="w-full rounded-xl border border-sage/20 bg-[#FDFCF0] px-4 py-3 text-sm text-ink
                       placeholder:text-muted/50 outline-none resize-y leading-relaxed
                       focus:border-sage focus:ring-2 focus:ring-sage/15 transition
                       font-sans"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', lineHeight: 1.7 }}
          />
        </div>

        {/* Next steps */}
        <div>
          <label className="block text-xs font-semibold text-ink/70 mb-1.5 uppercase tracking-wider">
            Próximos Passos
          </label>
          <textarea
            value={nextSteps}
            onChange={(e) => handleNextSteps(e.target.value)}
            placeholder="Planejamento estratégico para a próxima sessão..."
            rows={3}
            className="w-full rounded-xl border border-sage/15 bg-sage/5 px-4 py-3 text-sm text-sage-dark
                       placeholder:text-muted/40 outline-none resize-y leading-relaxed
                       focus:border-sage focus:ring-2 focus:ring-sage/15 transition"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', lineHeight: 1.7 }}
          />
        </div>
      </div>
    </article>
  );
}

// ── Share modal ───────────────────────────────────────────────────────────────

function ShareModal({ patientId, patientName, onClose }: {
  patientId:   string;
  patientName: string;
  onClose:     () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  const handleShare = async () => {
    setLoading(true);
    setError('');
    try {
      await notesApi.shareWhatsApp(patientId);
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao compartilhar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink text-lg">Compartilhar Prontuário</h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-sage-dark" />
            <p className="text-sm text-ink font-medium">Prontuário enviado com sucesso!</p>
            <p className="text-xs text-muted">O PDF foi enviado pelo WhatsApp para o número de {patientName}.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">
              O prontuário completo de <strong className="text-ink">{patientName}</strong> será gerado e
              enviado diretamente pelo WhatsApp cadastrado do paciente.
            </p>
            {error && (
              <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary py-2.5 px-4 text-sm">
                Cancelar
              </button>
              <button onClick={handleShare} disabled={loading} className="btn-primary py-2.5 px-4 text-sm">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando…</> : <><Share2 className="h-4 w-4" />Enviar pelo WhatsApp</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Patient sidebar ───────────────────────────────────────────────────────────

function PatientSidebar({
  patientName,
  entries,
}: {
  patientName: string;
  entries: TimelineEntry[];
}) {
  const total      = entries.length;
  const withNotes  = entries.filter((e) => e.note).length;
  const completed  = entries.filter((e) => e.status === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-soft p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-sage/15 flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-sage-dark text-sm">
              {patientName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink text-sm truncate">{patientName}</p>
            <p className="text-xs text-muted">Prontuário clínico</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sage/10">
          <div className="rounded-xl bg-sage/5 p-2.5 text-center">
            <p className="text-xl font-bold text-sage-dark">{total}</p>
            <p className="text-[10px] text-muted leading-tight">sessões</p>
          </div>
          <div className="rounded-xl bg-sage/5 p-2.5 text-center">
            <p className="text-xl font-bold text-sage-dark">{completed}</p>
            <p className="text-[10px] text-muted leading-tight">concluídas</p>
          </div>
          <div className="col-span-2 rounded-xl bg-sage/5 p-2.5 text-center">
            <p className="text-xl font-bold text-sage-dark">{withNotes}</p>
            <p className="text-[10px] text-muted leading-tight">com anotação</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-2xl bg-white shadow-soft p-4 text-xs text-muted space-y-2">
        <p className="font-semibold text-ink/70 uppercase tracking-wider text-[10px]">Legenda</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sage/25" />
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warm" />
          <span>Agendada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-terracotta/15" />
          <span>Cancelada / Falta</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ClinicalRecordPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: patient }  = usePatient(id!);
  const { data: timeline, isLoading, isError } = useClinicalTimeline(id!);

  const entries     = timeline?.entries ?? [];
  const patientName = timeline?.patientName ?? patient?.fullName ?? '';

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
      const response = await fetch(`${BASE}/notes/export/patient/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Falha ao gerar PDF');
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `prontuario_${(patientName || 'paciente').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-white animate-pulse shadow-soft" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div role="alert" className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-sm text-terracotta">
          Não foi possível carregar o prontuário.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: '#FDFCF0' }}>
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-sage/10 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(`/pacientes/${id}`)}
            className="text-muted hover:text-ink transition p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-sage shrink-0" />
              <h1 className="font-display font-semibold text-ink truncate">
                Prontuário — {patientName}
              </h1>
            </div>
            <p className="text-xs text-muted mt-0.5">{entries.length} sessão(ões) registrada(s)</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShareOpen(true)}
              className="btn-secondary py-2 px-3 text-sm gap-1.5"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="btn-primary py-2 px-3 text-sm gap-1.5"
            >
              {pdfLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando…</>
                : <><FileDown className="h-4 w-4" /><span className="hidden sm:inline">Exportar PDF</span></>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-20">
            <PatientSidebar patientName={patientName} entries={entries} />
          </div>
        </aside>

        {/* Timeline */}
        <main className="flex-1 space-y-4">
          {entries.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-sage/20 p-10 text-center space-y-3">
              <Calendar className="h-8 w-8 text-muted mx-auto" />
              <p className="text-sm text-muted">Nenhuma sessão registrada.</p>
              <Link
                to={`/agenda?patientId=${id}`}
                className="inline-block text-sm text-sage hover:text-sage-dark font-medium transition"
              >
                Agendar primeira sessão →
              </Link>
            </div>
          ) : (
            entries.map((entry, idx) => (
              <EvolutionCard
                key={entry.sessionId}
                entry={entry}
                index={idx}
                total={entries.length}
                patientId={id!}
              />
            ))
          )}
        </main>
      </div>

      {shareOpen && (
        <ShareModal
          patientId={id!}
          patientName={patientName}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
