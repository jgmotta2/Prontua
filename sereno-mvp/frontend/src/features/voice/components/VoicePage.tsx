import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mic } from 'lucide-react';
import { ConsentValidator } from './ConsentValidator';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceReportEditor } from './VoiceReportEditor';
import { useVoiceReport } from '../hooks/useVoiceReport';
import type { VoiceReport } from '../hooks/useVoiceReport';

type Phase = 'consent' | 'recording' | 'editor';

interface LocationState {
  patientId: string;
  patientName: string;
  scheduledAt: string;
}

const PHASES: Phase[] = ['consent', 'recording', 'editor'];
const PHASE_LABEL: Record<Phase, string> = {
  consent: 'Consentimento',
  recording: 'Gravação',
  editor: 'Prontuário',
};

/**
 * Página principal do módulo de voz.
 *
 * Orquestra os 3 pilares arquiteturais:
 *   1. CONSENT   → ConsentValidator (modal bloqueante)
 *   2. RECORDING → VoiceRecorder    (gravação efêmera + upload)
 *   3. EDITOR    → VoiceReportEditor (revisão + PDF)
 *
 * URL: /agenda/:sessionId/prontuario-voz
 * State (via React Router): { patientId, patientName, scheduledAt }
 */
export function VoicePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Dados da sessão passados via router state (vindos da AgendaPage)
  const locationState = (location.state ?? {}) as Partial<LocationState>;
  const patientId   = locationState.patientId   ?? null;
  const patientName = locationState.patientName  ?? 'Paciente';
  const scheduledAt = locationState.scheduledAt  ?? new Date().toISOString();

  const [phase, setPhase] = useState<Phase>('consent');
  const [liveReport, setLiveReport] = useState<VoiceReport | null>(null);

  const { data: existingReport, isLoading: loadingReport } = useVoiceReport(sessionId ?? null);

  // Se já existe prontuário (gerado anteriormente), vai direto para o editor
  const effectiveReport = liveReport ?? existingReport ?? null;
  const effectivePhase: Phase = effectiveReport ? 'editor' : phase;

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted">ID de sessão não encontrado na URL.</p>
      </div>
    );
  }

  /** Chamado quando a IA retorna o prontuário gerado */
  const handleReportReady = (
    reportId: string,
    structuredReport: string,
    rawTranscription: string,
  ) => {
    setLiveReport({
      id: reportId,
      sessionId: sessionId,
      rawTranscription,
      structuredReport,
      isFinalized: false,
      hasPdf: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: '', name: '' },
      session: {
        scheduledAt,
        patient: { fullName: patientName },
      },
    });
    setPhase('editor');
  };

  const phaseIndex = PHASES.indexOf(effectivePhase);

  return (
    <div className="min-h-screen bg-cream">
      {/* Topbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-warm bg-cream/80 px-6 py-4 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar</span>
        </button>

        <span className="hidden text-warm sm:block">·</span>

        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-sage" />
          <h1 className="font-display font-semibold text-ink">Prontuário por Voz</h1>
        </div>

        <span className="hidden text-warm sm:block">·</span>
        <span className="hidden text-sm text-muted sm:block">
          {patientName} · {new Date(scheduledAt).toLocaleDateString('pt-BR')}
        </span>

        {/* Stepper */}
        <div className="ml-auto flex items-center gap-1 text-xs">
          {PHASES.map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  effectivePhase === p
                    ? 'bg-sage text-white'
                    : i < phaseIndex
                    ? 'bg-sage/20 text-sage'
                    : 'bg-warm text-muted'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-px w-4 bg-warm" />}
            </div>
          ))}
          <span className="ml-2 text-muted">{PHASE_LABEL[effectivePhase]}</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* Loading do relatório existente */}
        {loadingReport && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
          </div>
        )}

        {/* FASE 1 — Consentimento */}
        {!loadingReport && effectivePhase === 'consent' && (
          <>
            {!patientId ? (
              <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-6 text-center text-sm text-terracotta">
                Dados do paciente não disponíveis. Volte à agenda e clique novamente em "Prontuário".
              </div>
            ) : (
              <ConsentValidator
                patientId={patientId}
                patientName={patientName}
                onConsentGranted={() => setPhase('recording')}
              />
            )}
          </>
        )}

        {/* FASE 2 — Gravação */}
        {!loadingReport && effectivePhase === 'recording' && (
          <div className="mx-auto max-w-lg">
            <VoiceRecorder
              sessionId={sessionId}
              onReportReady={handleReportReady}
            />
          </div>
        )}

        {/* FASE 3 — Editor do prontuário */}
        {!loadingReport && effectivePhase === 'editor' && effectiveReport && (
          <VoiceReportEditor
            report={effectiveReport}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}
