import { Clock, Zap } from 'lucide-react';
import { useCheckout } from '../hooks/useBilling';

interface Props {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: Props) {
  const checkout = useCheckout();

  const isUrgent = daysLeft <= 1;
  const label = daysLeft === 0
    ? 'Seu período de teste encerrou hoje'
    : daysLeft === 1
    ? '1 dia restante no período de teste'
    : `${daysLeft} dias restantes no período de teste`;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm
        ${isUrgent
          ? 'bg-terracotta/10 border-b border-terracotta/20 text-terracotta'
          : 'bg-amber-50 border-b border-amber-200 text-amber-800'
        }`}
    >
      <span className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <button
        onClick={() => checkout.mutate()}
        disabled={checkout.isPending}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition shrink-0
          ${isUrgent
            ? 'bg-terracotta text-white hover:bg-terracotta/90'
            : 'bg-amber-600 text-white hover:bg-amber-700'
          } disabled:opacity-60`}
      >
        <Zap className="h-3 w-3" />
        {checkout.isPending ? 'Aguarde...' : 'Assinar agora'}
      </button>
    </div>
  );
}
