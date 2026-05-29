import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  FileText,
  Download,
  Lock,
  Edit3,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useUpdateReport, useFinalizeReport, useDownloadPdf } from '../hooks/useVoiceReport';
import type { VoiceReport } from '../hooks/useVoiceReport';

interface Props {
  report: VoiceReport;
  sessionId: string;
}

/**
 * Editor dividido: texto editável à esquerda, preview do relatório à direita.
 *
 * PILAR 3 — Documento Médico Oficial.
 * O profissional revisa/edita o Markdown gerado pela IA antes de finalizar.
 * Após clicar em "Finalizar Prontuário", o PDF é gerado e o registro é travado.
 */
export function VoiceReportEditor({ report, sessionId }: Props) {
  const [showRawTranscription, setShowRawTranscription] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const update = useUpdateReport(report.id, sessionId);
  const finalize = useFinalizeReport(report.id, sessionId);
  const downloadPdf = useDownloadPdf(report.id);

  const { register, handleSubmit, watch, formState: { isDirty } } = useForm({
    defaultValues: { structuredReport: report.structuredReport },
  });

  const currentText = watch('structuredReport');

  // Auto-save com debounce de 3s
  useEffect(() => {
    if (!isDirty || report.isFinalized) return;
    const timeout = setTimeout(async () => {
      try {
        await update.mutateAsync(currentText);
        setLastSaved(new Date());
      } catch {
        // silencioso — erro exibido manualmente
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [currentText, isDirty, report.isFinalized, update]);

  const onSaveManual = handleSubmit(async ({ structuredReport }) => {
    await update.mutateAsync(structuredReport);
    setLastSaved(new Date());
  });

  /** Converte Markdown simples para exibição visual (preview) */
  const renderPreview = (md: string) => {
    return md
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="mt-5 mb-2 border-b border-sage/30 pb-1 text-sm font-bold uppercase tracking-wide text-sage">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <li key={i} className="ml-4 text-sm text-ink/80">
              {line.slice(2)}
            </li>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-2" />;
        if (line.startsWith('_') && line.endsWith('_')) {
          return <p key={i} className="text-sm italic text-muted">{line.slice(1, -1)}</p>;
        }
        return <p key={i} className="text-sm text-ink/90">{line}</p>;
      });
  };

  const sessionDate = new Date(report.session.scheduledAt).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header do relatório */}
      <div className="flex items-start justify-between rounded-2xl border border-warm bg-white p-5 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sage" />
            <h2 className="font-display text-lg font-semibold text-ink">Prontuário de Voz</h2>
            {report.isFinalized && (
              <span className="flex items-center gap-1 rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
                <Lock className="h-3 w-3" />
                Finalizado
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {report.session.patient.fullName} · {sessionDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {report.isFinalized ? (
            <button
              onClick={() => downloadPdf.mutate()}
              disabled={downloadPdf.isPending}
              className="flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-dark disabled:opacity-60"
            >
              {downloadPdf.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Baixar PDF
            </button>
          ) : (
            <>
              {!report.isFinalized && (
                <button
                  onClick={onSaveManual}
                  disabled={!isDirty || update.isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-warm px-4 py-2 text-sm font-medium text-ink transition hover:bg-warm disabled:opacity-40"
                >
                  {update.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Salvar
                </button>
              )}
              <button
                onClick={() => finalize.mutate()}
                disabled={finalize.isPending || isDirty}
                className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-cream transition hover:bg-ink/90 disabled:opacity-60"
                title={isDirty ? 'Salve as alterações antes de finalizar' : ''}
              >
                {finalize.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {finalize.isPending ? 'Gerando PDF...' : 'Finalizar e Baixar PDF'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Aviso de finalização */}
      {report.isFinalized && (
        <div className="flex items-start gap-3 rounded-xl border border-sage/30 bg-sage/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
          <p className="text-sm text-ink">
            <strong>Prontuário finalizado.</strong> Este registro está travado conforme exigência do CFP
            e não pode ser editado. Para download do PDF, use o botão acima.
          </p>
        </div>
      )}

      {isDirty && !report.isFinalized && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Edit3 className="h-3.5 w-3.5" />
          Salvamento automático em 3s · {lastSaved ? `Último salvo: ${lastSaved.toLocaleTimeString('pt-BR')}` : 'Não salvo'}
        </div>
      )}

      {/* Erros */}
      {(update.error || finalize.error || downloadPdf.error) && (
        <div className="flex items-start gap-3 rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {((update.error || finalize.error || downloadPdf.error) as any)?.message ?? 'Ocorreu um erro.'}
        </div>
      )}

      {/* Vista dupla: Editor | Preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Coluna esquerda: Editor de Markdown */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Edit3 className="h-3.5 w-3.5" />
            Relatório Estruturado (editável)
          </label>
          <textarea
            {...register('structuredReport')}
            disabled={report.isFinalized}
            rows={28}
            spellCheck={true}
            lang="pt-BR"
            className={`w-full rounded-xl border p-4 font-mono text-xs leading-relaxed text-ink outline-none transition resize-none
              ${report.isFinalized
                ? 'border-warm bg-warm/30 text-muted cursor-not-allowed'
                : 'border-warm bg-white focus:border-sage focus:ring-1 focus:ring-sage/30'
              }`}
          />
        </div>

        {/* Coluna direita: Preview visual */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <FileText className="h-3.5 w-3.5" />
            Preview do Documento
          </label>
          <div className="h-full min-h-64 rounded-xl border border-warm bg-white p-5 text-sm leading-relaxed">
            {/* Timbre simulado */}
            <div className="mb-4 border-b-2 border-ink/80 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-ink/60">Prontua — Prontuário Clínico</p>
              <p className="mt-0.5 text-[10px] text-muted">
                Paciente: {report.session.patient.fullName} · {sessionDate}
              </p>
            </div>
            {/* Conteúdo renderizado */}
            <div className="space-y-0.5">
              {renderPreview(currentText)}
            </div>
            {/* Rodapé simulado */}
            <div className="mt-6 border-t border-warm pt-3 text-[9px] text-muted text-center">
              Documento gerado pela plataforma Prontua · Conformidade LGPD (Lei nº 13.709/2018)
            </div>
          </div>
        </div>
      </div>

      {/* Transcrição bruta (collapsible) */}
      <div className="rounded-xl border border-warm">
        <button
          onClick={() => setShowRawTranscription(!showRawTranscription)}
          className="flex w-full items-center justify-between p-4 text-sm font-medium text-muted hover:bg-warm/40 rounded-xl transition"
        >
          <span>Transcrição bruta (Whisper)</span>
          {showRawTranscription ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        {showRawTranscription && (
          <div className="border-t border-warm p-4">
            <p className="font-mono text-xs leading-relaxed text-muted whitespace-pre-wrap">
              {report.rawTranscription}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
