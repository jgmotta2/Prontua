import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  Share2,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Smile,
  Frown,
  Meh,
  PencilLine,
  ChevronLeft,
  LayoutList,
  ShieldAlert,
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

const MOOD_CONFIG = [
  { value: 1, label: 'Muito triste', icon: Frown,  color: 'text-terracotta' },
  { value: 2, label: 'Triste',       icon: Frown,  color: 'text-terracotta/70' },
  { value: 3, label: 'Neutro',       icon: Meh,    color: 'text-muted' },
  { value: 4, label: 'Bem',          icon: Smile,  color: 'text-sage' },
  { value: 5, label: 'Muito bem',    icon: Smile,  color: 'text-sage-dark' },
];

// ── Mood picker ───────────────────────────────────────────────────────────────

function MoodPicker({
  value,
  onChange,
  readOnly = false,
}: {
  value?: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly && !value) return <span className="text-sm text-muted italic">Não informado</span>;
  return (
    <div className="flex items-center gap-1">
      {MOOD_CONFIG.map(({ value: v, label, icon: Icon, color }) => (
        <button
          key={v}
          type="button"
          title={label}
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(v)}
          className={`rounded-lg p-1.5 transition ${
            value === v
              ? `${color} bg-sage/10 ring-1 ring-sage/30`
              : readOnly
              ? 'text-muted/20 cursor-default'
              : 'text-muted/40 hover:text-muted'
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

// ── SessionCard (sidebar item) ────────────────────────────────────────────────

function SessionCard({
  entry,
  index,
  total,
  isActive,
  onClick,
}: {
  entry:    TimelineEntry;
  index:    number;
  total:    number;
  isActive: boolean;
  onClick:  () => void;
}) {
  const num = total - index;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl px-3 py-3 transition-all group ${
        isActive
          ? 'bg-white border-l-4 border-sage-dark shadow-sm'
          : 'bg-transparent border-l-4 border-transparent hover:bg-white/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-semibold truncate ${isActive ? 'text-sage-dark' : 'text-ink/70'}`}>
            Sessão {num}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {new Date(entry.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            {' · '}{formatTime(entry.scheduledAt)}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_COLOR[entry.status] ?? 'bg-warm text-ink'}`}
        >
          {STATUS_LABEL[entry.status] ?? entry.status}
        </span>
      </div>

      {/* Technique chip */}
      {entry.note?.techniqueUsed && (
        <span className="mt-1.5 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-sage/15 text-sage-dark">
          {entry.note.techniqueUsed}
        </span>
      )}

      {/* No note indicator */}
      {!entry.note?.content && (
        <p className="mt-1 text-[10px] text-muted/60 italic">Sem anotação</p>
      )}
    </button>
  );
}

// ── SessionSidebar ────────────────────────────────────────────────────────────

function SessionSidebar({
  entries,
  selectedId,
  onSelect,
  onNewEvolution,
  patientId,
}: {
  entries:        TimelineEntry[];
  selectedId:     string | null;
  onSelect:       (id: string) => void;
  onNewEvolution: () => void;
  patientId:      string;
}) {
  const hasUneditedSession = entries.some(
    (e) => !e.note?.content && (e.status === 'SCHEDULED' || e.status === 'CONFIRMED'),
  );

  return (
    <div className="flex flex-col h-full">
      {/* New evolution button */}
      <div className="p-3 border-b border-sage/10 shrink-0">
        {hasUneditedSession ? (
          <button
            onClick={onNewEvolution}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sage px-3 py-2.5 text-sm font-semibold text-cream hover:bg-sage-dark transition"
          >
            <PencilLine className="h-4 w-4" />
            + Nova Evolução
          </button>
        ) : (
          <Link
            to={`/agenda?patientId=${patientId}`}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sage px-3 py-2.5 text-sm font-semibold text-cream hover:bg-sage-dark transition"
          >
            <Calendar className="h-4 w-4" />
            Agendar Sessão
          </Link>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {entries.length === 0 && (
          <p className="text-xs text-muted text-center py-8">Nenhuma sessão registrada.</p>
        )}
        {entries.map((entry, idx) => (
          <SessionCard
            key={entry.sessionId}
            entry={entry}
            index={idx}
            total={entries.length}
            isActive={entry.sessionId === selectedId}
            onClick={() => onSelect(entry.sessionId)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ patientId }: { patientId: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6 py-12">
      <div className="mb-5 opacity-30">
        <BookOpen className="h-16 w-16 text-sage mx-auto" />
      </div>
      <p className="font-display text-lg font-semibold text-ink/50 mb-2">
        Selecione uma sessão
      </p>
      <p className="text-sm text-muted/60 max-w-xs leading-relaxed">
        Escolha uma sessão no histórico ao lado ou clique em "+ Nova Evolução" para começar.
      </p>
      <Link
        to={`/agenda?patientId=${patientId}`}
        className="mt-6 inline-flex items-center gap-2 text-sm text-sage hover:text-sage-dark font-medium transition"
      >
        <Calendar className="h-4 w-4" />
        Agendar primeira sessão →
      </Link>
    </div>
  );
}

// ── Edit unlock modal ─────────────────────────────────────────────────────────

function EditUnlockModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Editar sessão histórica</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Alterações em sessões concluídas ficam registradas em log de auditoria (quem editou e quando), conforme exigências do CFP.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel} className="btn-secondary py-2 px-4 text-sm">Cancelar</button>
          <button onClick={onConfirm} className="btn-primary py-2 px-4 text-sm">
            Entendi — Editar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session editor ────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SessionEditor({
  entry,
  index,
  total,
  patientId,
  isEditing,
  onRequestEdit,
}: {
  entry:         TimelineEntry;
  index:         number;
  total:         number;
  patientId:     string;
  isEditing:     boolean;
  onRequestEdit: () => void;
}) {
  const upsert = useUpsertNote(patientId);

  const [content,    setContent]    = useState(entry.note?.content   ?? '');
  const [nextSteps,  setNextSteps]  = useState(entry.note?.nextSteps ?? '');
  const [technique,  setTechnique]  = useState(entry.note?.techniqueUsed ?? '');
  const [mood,       setMood]       = useState<number | undefined>(entry.note?.patientMood ?? undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when entry changes
  useEffect(() => {
    setContent(entry.note?.content ?? '');
    setNextSteps(entry.note?.nextSteps ?? '');
    setTechnique(entry.note?.techniqueUsed ?? '');
    setMood(entry.note?.patientMood ?? undefined);
    setSaveStatus('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.sessionId, entry.note?.updatedAt]);

  const scheduleAutoSave = useCallback(
    (c: string, ns: string, t: string, m: number | undefined) => {
      if (!isEditing) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaveStatus('idle');
      if (!c.trim() && !ns.trim() && !t.trim() && m == null) return;
      timerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        const data: UpsertNoteData = {};
        if (c  !== undefined) data.content       = c;
        if (ns !== undefined) data.nextSteps      = ns;
        if (t  !== undefined) data.techniqueUsed  = t;
        if (m  != null)       data.patientMood    = m;
        try {
          await upsert.mutateAsync({ sessionId: entry.sessionId, data });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
          setSaveStatus('error');
        }
      }, 2000);
    },
    [isEditing, entry.sessionId, upsert],
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleContent   = (v: string) => { setContent(v);   scheduleAutoSave(v, nextSteps, technique, mood); };
  const handleNextSteps = (v: string) => { setNextSteps(v); scheduleAutoSave(content, v, technique, mood); };
  const handleTechnique = (v: string) => { setTechnique(v); scheduleAutoSave(content, nextSteps, v, mood); };
  const handleMood      = (v: number) => { setMood(v);       scheduleAutoSave(content, nextSteps, technique, v); };

  const num        = total - index;
  const isPast     = entry.status === 'COMPLETED' || entry.status === 'CANCELED' || entry.status === 'NO_SHOW';
  const readOnly   = isPast && !isEditing;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Editor header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-ink text-lg">Sessão {num}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[entry.status] ?? 'bg-warm text-ink'}`}>
              {STATUS_LABEL[entry.status] ?? entry.status}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            {formatFullDate(entry.scheduledAt)}
            {' · '}{formatTime(entry.scheduledAt)}
            {' · '}{entry.durationMin}min
            {' · '}{entry.mode === 'ONLINE' ? 'Online' : 'Presencial'}
            {' · '}{formatBRL(entry.value)}
          </p>
          <p className="text-xs text-muted mt-0.5">{entry.professional.name}</p>
        </div>

        {/* Save status / Edit button */}
        <div className="flex items-center gap-2 shrink-0">
          {isEditing && saveStatus === 'saving' && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />Salvando
            </span>
          )}
          {isEditing && saveStatus === 'saved' && (
            <span className="text-xs text-sage-dark flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />Salvo
            </span>
          )}
          {isEditing && saveStatus === 'error' && (
            <span className="text-xs text-terracotta flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />Erro
            </span>
          )}
          {readOnly && (
            <button
              onClick={onRequestEdit}
              className="flex items-center gap-1.5 text-xs text-muted border border-sage/20 rounded-lg px-3 py-1.5 hover:bg-white hover:text-ink transition"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Editar sessão
            </button>
          )}
          {isEditing && !isPast && (
            <span className="text-xs text-sage-dark flex items-center gap-1 bg-sage/10 px-2 py-1 rounded-lg">
              <CheckCircle2 className="h-3 w-3" />Auto-save ativo
            </span>
          )}
          {isEditing && isPast && (
            <span className="text-xs text-amber-700 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              <ShieldAlert className="h-3 w-3" />Edição auditada
            </span>
          )}
        </div>
      </div>

      {/* Technique + Mood row */}
      <div
        className={`flex flex-wrap items-center gap-5 p-4 rounded-xl mb-5 ${
          readOnly ? 'bg-transparent' : 'bg-white/60 border border-sage/10'
        }`}
      >
        {/* Technique */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted mr-1">Técnica:</span>
          {readOnly ? (
            technique
              ? <span className="text-xs px-2 py-0.5 rounded-full bg-sage/15 text-sage-dark">{technique}</span>
              : <span className="text-sm text-muted italic">Não registrada</span>
          ) : (
            TECHNIQUES.map((t) => (
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
            ))
          )}
        </div>

        {/* Mood */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Humor:</span>
          <MoodPicker value={mood} onChange={handleMood} readOnly={readOnly} />
        </div>
      </div>

      {/* Clinical evolution */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-ink/60 mb-2 uppercase tracking-wider">
          Evolução clínica
        </label>
        {readOnly ? (
          <div className="text-sm text-ink leading-relaxed min-h-[80px] whitespace-pre-wrap">
            {content || <span className="text-muted italic">Nenhuma anotação registrada.</span>}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => handleContent(e.target.value)}
            placeholder="Descreva a evolução da sessão..."
            rows={8}
            autoFocus
            className="w-full rounded-xl border border-sage/20 bg-[#FDFCF0] px-4 py-3 text-sm text-ink
                       placeholder:text-muted/40 outline-none resize-y leading-relaxed
                       focus:border-sage focus:ring-2 focus:ring-sage/15 transition"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', lineHeight: 1.8 }}
          />
        )}
      </div>

      {/* Next steps */}
      <div>
        <label className="block text-xs font-semibold text-ink/60 mb-2 uppercase tracking-wider">
          Próximos Passos
        </label>
        {readOnly ? (
          <div className="text-sm text-sage-dark leading-relaxed min-h-[40px] whitespace-pre-wrap">
            {nextSteps || <span className="text-muted italic">Nenhum plano registrado.</span>}
          </div>
        ) : (
          <textarea
            value={nextSteps}
            onChange={(e) => handleNextSteps(e.target.value)}
            placeholder="Planejamento para a próxima sessão..."
            rows={3}
            className="w-full rounded-xl border border-sage/15 bg-sage/5 px-4 py-3 text-sm text-sage-dark
                       placeholder:text-muted/40 outline-none resize-y leading-relaxed
                       focus:border-sage focus:ring-2 focus:ring-sage/15 transition"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', lineHeight: 1.8 }}
          />
        )}
      </div>

      {/* Read-only document footer */}
      {readOnly && (
        <div className="mt-8 pt-4 border-t border-sage/10 flex items-center justify-between text-xs text-muted">
          <span>
            {entry.note?.updatedAt
              ? `Última edição: ${new Date(entry.note.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'Sem anotações'}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> Documento finalizado
          </span>
        </div>
      )}
    </div>
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
            <p className="text-xs text-muted">O PDF foi enviado pelo WhatsApp para {patientName}.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">
              O prontuário completo de <strong className="text-ink">{patientName}</strong> será gerado e
              enviado pelo WhatsApp cadastrado do paciente.
            </p>
            {error && (
              <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary py-2.5 px-4 text-sm">Cancelar</button>
              <button onClick={handleShare} disabled={loading} className="btn-primary py-2.5 px-4 text-sm">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando…</>
                  : <><Share2 className="h-4 w-4" />Enviar pelo WhatsApp</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Patient header ────────────────────────────────────────────────────────────

function PatientHeader({
  patientName,
  sessionCount,
  patientId,
  onShowHistory,
  onShare,
  onDownloadPdf,
  pdfLoading,
}: {
  patientName:    string;
  sessionCount:   number;
  patientId:      string;
  onShowHistory:  () => void;
  onShare:        () => void;
  onDownloadPdf:  () => void;
  pdfLoading:     boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-sage/10">
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
        <button
          onClick={() => navigate(`/pacientes/${patientId}`)}
          className="text-muted hover:text-ink transition p-1 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-sage/15 flex items-center justify-center shrink-0">
            <span className="font-bold text-sage-dark text-sm">
              {patientName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-ink text-sm truncate">{patientName}</p>
            <p className="text-[11px] text-muted">{sessionCount} sessão(ões)</p>
          </div>
        </div>

        {/* Mobile: "Ver Histórico" button */}
        <button
          onClick={onShowHistory}
          className="md:hidden flex items-center gap-1.5 text-xs text-muted border border-sage/20 rounded-lg px-2.5 py-1.5 hover:bg-sage/5 transition shrink-0"
        >
          <LayoutList className="h-3.5 w-3.5" />
          Histórico
        </button>

        {/* Action buttons */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={onShare}
            className="btn-secondary py-1.5 px-3 text-sm gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
          <button
            onClick={onDownloadPdf}
            disabled={pdfLoading}
            className="btn-primary py-1.5 px-3 text-sm gap-1.5"
          >
            {pdfLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando…</>
              : <><FileDown className="h-4 w-4" /><span className="hidden sm:inline">Exportar PDF</span></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open:     boolean;
  onClose:  () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-stone-50 shadow-2xl transition-transform duration-300 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-sage/10">
          <span className="font-semibold text-sm text-ink">Histórico de sessões</span>
          <button onClick={onClose} className="text-muted hover:text-ink transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-49px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ClinicalRecordPage() {
  const { id }   = useParams<{ id: string }>();
  const patientId = id!;

  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [isEditMode,     setIsEditMode]     = useState(false);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [showDrawer,     setShowDrawer]     = useState(false);
  const [shareOpen,      setShareOpen]      = useState(false);
  const [pdfLoading,     setPdfLoading]     = useState(false);

  const { data: patient }                         = usePatient(patientId);
  const { data: timeline, isLoading, isError }    = useClinicalTimeline(patientId);

  const entries     = timeline?.entries ?? [];
  const patientName = timeline?.patientName ?? patient?.fullName ?? '';

  const selectedEntry = entries.find((e) => e.sessionId === selectedId) ?? null;
  const selectedIndex = entries.findIndex((e) => e.sessionId === selectedId);

  // Reset edit mode when session changes
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setIsEditMode(false);
    setShowDrawer(false);
  }, []);

  // "+ Nova Evolução": find most recent unedited session
  const handleNewEvolution = useCallback(() => {
    const target = entries.find(
      (e) => !e.note?.content && (e.status === 'SCHEDULED' || e.status === 'CONFIRMED'),
    );
    if (target) {
      setSelectedId(target.sessionId);
      setIsEditMode(true);
      setShowDrawer(false);
    }
  }, [entries]);

  const handleRequestEdit = useCallback(() => {
    const entry = entries.find((e) => e.sessionId === selectedId);
    const isPast = entry?.status === 'COMPLETED' || entry?.status === 'CANCELED' || entry?.status === 'NO_SHOW';
    if (isPast) {
      setShowEditModal(true);
    } else {
      setIsEditMode(true);
    }
  }, [entries, selectedId]);

  const handleConfirmEdit = useCallback(() => {
    setShowEditModal(false);
    setIsEditMode(true);
  }, []);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
      const response = await fetch(`${BASE}/notes/export/patient/${patientId}`, { credentials: 'include' });
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div role="alert" className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-sm text-terracotta">
          Não foi possível carregar o prontuário.
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <SessionSidebar
      entries={entries}
      selectedId={selectedId}
      onSelect={handleSelect}
      onNewEvolution={handleNewEvolution}
      patientId={patientId}
    />
  );

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#FDFCF0' }}>
      {/* Patient header — sticky */}
      <PatientHeader
        patientName={patientName}
        sessionCount={entries.length}
        patientId={patientId}
        onShowHistory={() => setShowDrawer(true)}
        onShare={() => setShareOpen(true)}
        onDownloadPdf={handleDownloadPdf}
        pdfLoading={pdfLoading}
      />

      {/* Mobile drawer */}
      <MobileDrawer open={showDrawer} onClose={() => setShowDrawer(false)}>
        {sidebarContent}
      </MobileDrawer>

      {/* Master-detail body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-sage/15 bg-stone-50 overflow-hidden">
          {sidebarContent}
        </aside>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          {selectedEntry ? (
            <div
              key={selectedId}
              className="animate-session-enter"
            >
              <SessionEditor
                entry={selectedEntry}
                index={selectedIndex}
                total={entries.length}
                patientId={patientId}
                isEditing={isEditMode}
                onRequestEdit={handleRequestEdit}
              />
            </div>
          ) : (
            <EmptyState patientId={patientId} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditUnlockModal
          onConfirm={handleConfirmEdit}
          onCancel={() => setShowEditModal(false)}
        />
      )}
      {shareOpen && (
        <ShareModal
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
