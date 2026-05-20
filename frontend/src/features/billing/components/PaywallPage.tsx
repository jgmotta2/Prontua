import { CheckCircle2, Zap, Lock } from 'lucide-react';
import { useCheckout, useBillingStatus } from '../hooks/useBilling';

const PLAN_FEATURES = [
  'Pacientes ilimitados',
  'Agenda e sessões ilimitadas',
  'Prontuários clínicos criptografados (LGPD)',
  'Controle financeiro completo',
  'Relatórios e exportação PDF',
  'Notificações via WhatsApp',
  'Suporte prioritário',
];

export function PaywallPage() {
  const checkout       = useCheckout();
  const { data: billing } = useBillingStatus();

  const isPastDue   = billing?.subscriptionStatus === 'PAST_DUE';
  const isCanceled  = billing?.subscriptionStatus === 'CANCELED';

  const title = isPastDue
    ? 'Pagamento pendente'
    : isCanceled
    ? 'Assinatura cancelada'
    : 'Seu período de teste encerrou';

  const subtitle = isPastDue
    ? 'Houve um problema com seu pagamento. Atualize sua forma de pagamento para continuar.'
    : isCanceled
    ? 'Sua assinatura foi cancelada. Assine novamente para continuar usando o Sereno.'
    : 'Você usou seus 3 dias gratuitos. Assine para continuar atendendo seus pacientes.';

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-2xl bg-sage/10 p-4">
            <Lock className="h-10 w-10 text-sage-dark" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="font-display text-2xl font-semibold text-ink text-center mb-2">
          {title}
        </h1>
        <p className="text-muted text-center text-sm mb-8">
          {subtitle}
        </p>

        {/* Plan card */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6">
          <div className="bg-sage p-5 text-white">
            <p className="text-sm font-medium opacity-80 mb-1">Plano Sereno Pro</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">R$ —</span>
              <span className="text-sm opacity-80">/mês</span>
            </div>
            <p className="text-xs opacity-70 mt-1">Preço definido pelo administrador</p>
          </div>

          <ul className="p-5 space-y-3">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-ink">
                <CheckCircle2 className="h-4 w-4 text-sage-dark shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => checkout.mutate()}
          disabled={checkout.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <Zap className="h-4 w-4" />
          {checkout.isPending ? 'Redirecionando...' : 'Assinar agora'}
        </button>

        <p className="text-xs text-muted text-center mt-4">
          Pagamento seguro via Stripe. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
