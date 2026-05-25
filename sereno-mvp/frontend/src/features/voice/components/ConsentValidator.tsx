import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useConsent, useRecordConsent } from '../hooks/useConsent';

interface Props {
  patientId: string;
  patientName: string;
  /** Chamado quando o consentimento está ativo/válido */
  onConsentGranted: () => void;
}

const TCLE_TEXT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)

O paciente acima identificado consente, de forma livre e esclarecida, com a gravação do áudio desta sessão clínica para fins exclusivos de geração de prontuário eletrônico.

CONDIÇÕES DO CONSENTIMENTO:
• O arquivo de áudio será processado por inteligência artificial e deletado permanentemente do servidor em até 60 segundos após a transcrição.
• Apenas o texto do prontuário (nunca o áudio) será armazenado de forma segura e criptografada.
• O paciente pode revogar este consentimento a qualquer momento, sem prejuízo ao atendimento.
• Os dados serão tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e as normas do Conselho Profissional correspondente.
• O prontuário gerado terá validade clínica e jurídica como documento oficial.

FINALIDADE: Documentação clínica para uso exclusivo do profissional de saúde responsável.
COMPARTILHAMENTO: Dados não serão compartilhados com terceiros sem novo consentimento.`;

/**
 * Modal bloqueante de consentimento.
 *
 * PILAR 1 — O botão de gravação literalmente não existe até este componente
 * registrar um TCLE ativo no banco de dados.
 */
export function ConsentValidator({ patientId, patientName, onConsentGranted }: Props) {
  const { data: consent, isLoading: checkingConsent } = useConsent(patientId);
  const recordConsent = useRecordConsent(patientId);

  // Se o paciente já tem TCLE ativo e na versão atual, libera direto
  if (!checkingConsent && consent?.hasActiveConsent && consent.isCurrentVersion) {
    onConsentGranted();
    return null;
  }

  if (checkingConsent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-cream p-8 shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
          <p className="text-sm text-muted">Verificando consentimento...</p>
        </div>
      </div>
    );
  }

  const isOutdated = consent?.hasActiveConsent && !consent.isCurrentVersion;

  const handleConfirm = async () => {
    try {
      await recordConsent.mutateAsync();
      onConsentGranted();
    } catch {
      // erro exibido via mutation state
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay bloqueante — não fecha ao clicar fora */}
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-xl rounded-2xl bg-cream shadow-xl">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 border-b border-warm p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10">
            {isOutdated ? (
              <AlertTriangle className="h-5 w-5 text-terracotta" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-sage" />
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              {isOutdated ? 'Renovação de Consentimento' : 'Consentimento para Gravação'}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Paciente: <strong className="text-ink">{patientName}</strong>
            </p>
          </div>
        </div>

        {/* Corpo — texto do TCLE */}
        <div className="p-5">
          {isOutdated && (
            <div className="mb-4 rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              ⚠️ O Termo de Consentimento foi atualizado. É necessário coletar novo aceite do paciente.
            </div>
          )}

          <div className="h-56 overflow-y-auto rounded-xl border border-warm bg-white p-4 text-xs leading-relaxed text-ink/70 font-sans whitespace-pre-line">
            {TCLE_TEXT}
          </div>

          <p className="mt-4 text-sm text-muted leading-relaxed">
            Ao clicar em <strong className="text-ink">"Confirmar Consentimento"</strong>, o profissional
            atesta que apresentou este termo ao paciente e obteve seu aceite verbal ou por assinatura,
            conforme exigido pelas normas do conselho profissional correspondente.
          </p>

          {recordConsent.error && (
            <div className="mt-3 rounded-xl border border-terracotta/30 bg-terracotta/5 p-3 text-sm text-terracotta">
              {(recordConsent.error as any)?.message ?? 'Erro ao registrar consentimento. Tente novamente.'}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-3 border-t border-warm p-5">
          <div className="flex-1 text-xs text-muted leading-tight">
            Este registro é auditável e armazenado com conformidade à LGPD (Lei nº 13.709/2018).
          </div>
          <button
            onClick={handleConfirm}
            disabled={recordConsent.isPending}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-dark disabled:opacity-60"
          >
            {recordConsent.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Confirmar Consentimento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
