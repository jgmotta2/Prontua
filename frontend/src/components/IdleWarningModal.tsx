import { Shield } from 'lucide-react';

interface IdleWarningModalProps {
  countdown: number;
  onContinue: () => void;
}

export function IdleWarningModal({ countdown, onContinue }: IdleWarningModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Blur backdrop que cobre dados do paciente */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-md" />

      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <Shield className="h-7 w-7 text-amber-600" />
        </div>

        <h2 className="font-display text-lg font-semibold text-ink mb-2">
          Sessão prestes a expirar
        </h2>
        <p className="text-sm text-muted mb-5 leading-relaxed">
          Para a segurança dos seus prontuários, sua sessão será encerrada em{' '}
          <span className="font-semibold text-ink">{countdown}</span> segundo{countdown !== 1 ? 's' : ''}.
        </p>

        <div className="mb-4 h-1.5 rounded-full bg-sage/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-sage-dark transition-all duration-1000"
            style={{ width: `${(countdown / 60) * 100}%` }}
          />
        </div>

        <button
          onClick={onContinue}
          className="btn-primary w-full"
          autoFocus
        >
          Continuar Trabalhando
        </button>
      </div>
    </div>
  );
}
