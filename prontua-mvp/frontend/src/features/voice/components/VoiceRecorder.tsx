import { Mic, Square, RotateCcw, Loader2, Upload } from 'lucide-react';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useUploadAudio } from '../hooks/useVoiceReport';

interface Props {
  sessionId: string;
  onReportReady: (reportId: string, structuredReport: string, rawTranscription: string) => void;
}

/** Formata segundos como MM:SS */
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Componente de gravação de áudio com waveform animada em SVG.
 *
 * PILAR 2 — Gravação efêmera.
 * O áudio é enviado ao backend assim que o profissional para a gravação.
 * No backend, ele é transcrito e deletado em < 60s.
 * O componente nunca persiste o áudio localmente além do Blob em memória.
 */
export function VoiceRecorder({ sessionId, onReportReady }: Props) {
  const rec = useVoiceRecording();
  const upload = useUploadAudio(sessionId);

  const handleStopAndUpload = async () => {
    rec.stopRecording();
    // aguarda o onstop do MediaRecorder processar o blob
    // O estado muda para 'stopped' quando o blob estiver pronto
  };

  // Monitora quando o blob fica disponível após parar
  const handleUploadBlob = async () => {
    if (!rec.audioBlob) return;
    try {
      const result = await upload.mutateAsync(rec.audioBlob);
      onReportReady(result.reportId, result.structuredReport, result.rawTranscription);
    } catch {
      // erro exibido via upload.error
    }
  };

  const isUploading = upload.isPending;
  const isRecording = rec.state === 'recording';
  const isStopped = rec.state === 'stopped';

  // ── Waveform SVG ─────────────────────────────────────────────────────────
  const svgWidth = 320;
  const svgHeight = 64;
  const barWidth = 6;
  const barGap = 4;
  const maxBarH = svgHeight - 8;

  const waveformBars = rec.frequencyBars.map((v, i) => {
    const h = Math.max(4, v * maxBarH);
    const x = i * (barWidth + barGap) + 2;
    const y = (svgHeight - h) / 2;
    return { x, y, h };
  });

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-soft">
      {/* Título da fase */}
      <div className="text-center">
        <h3 className="font-display text-xl font-semibold text-ink">
          {isUploading ? 'Processando com IA...' : 'Gravação da Sessão'}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {isUploading
            ? 'Transcrevendo e estruturando o prontuário. Aguarde...'
            : isRecording
            ? 'Gravando... Fale normalmente'
            : isStopped
            ? 'Gravação concluída. Envie para processar.'
            : 'Pressione o microfone para iniciar'}
        </p>
      </div>

      {/* Waveform animada */}
      <div className="flex h-16 items-center">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="overflow-visible"
        >
          {waveformBars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x}
              y={bar.y}
              width={barWidth}
              height={bar.h}
              rx={barWidth / 2}
              fill={isRecording ? '#6B8E7F' : '#E8DDC8'}
              style={{
                transition: isRecording ? 'height 0.08s ease, y 0.08s ease' : 'none',
              }}
            />
          ))}
        </svg>
      </div>

      {/* Cronômetro */}
      <div
        className={`font-mono text-4xl font-bold tabular-nums tracking-widest ${
          isRecording ? 'text-sage' : 'text-muted'
        }`}
      >
        {formatTime(rec.elapsedSeconds)}
      </div>

      {/* Erro de gravação */}
      {rec.error && (
        <div className="w-full rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta">
          {rec.error}
        </div>
      )}

      {/* Erro de upload */}
      {upload.error && (
        <div className="w-full rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta">
          {(upload.error as any)?.message ?? 'Erro ao processar o áudio. Tente novamente.'}
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-4">
        {/* Botão principal: Gravar / Parar */}
        {!isStopped && !isUploading && (
          <button
            onClick={isRecording ? handleStopAndUpload : rec.startRecording}
            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-soft transition-all ${
              isRecording
                ? 'bg-terracotta text-white hover:bg-terracotta/90 scale-110'
                : 'bg-sage text-white hover:bg-sage-dark'
            }`}
          >
            {isRecording ? (
              <Square className="h-6 w-6 fill-white" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
          </button>
        )}

        {/* Enviar para IA */}
        {isStopped && !isUploading && (
          <>
            <button
              onClick={rec.resetRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-warm bg-cream text-muted transition hover:bg-warm"
              title="Gravar novamente"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={handleUploadBlob}
              className="flex items-center gap-2 rounded-xl bg-sage px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-sage-dark"
            >
              <Upload className="h-5 w-5" />
              Gerar Prontuário
            </button>
          </>
        )}

        {/* Loading IA */}
        {isUploading && (
          <div className="flex items-center gap-3 text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-sage" />
            <span className="text-sm">Whisper + GPT-4o em processamento...</span>
          </div>
        )}
      </div>

      {/* Indicador de gravação ativa */}
      {isRecording && (
        <div className="flex items-center gap-2 text-xs text-terracotta">
          <span className="h-2 w-2 animate-pulse rounded-full bg-terracotta" />
          REC — Áudio será deletado automaticamente após transcrição
        </div>
      )}

      {/* Tamanho do arquivo gravado */}
      {isStopped && rec.audioBlob && (
        <p className="text-xs text-muted">
          Arquivo: {(rec.audioBlob.size / (1024 * 1024)).toFixed(2)} MB · {formatTime(rec.elapsedSeconds)} gravados
        </p>
      )}
    </div>
  );
}
