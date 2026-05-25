import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'sage' | 'terracotta' | 'ink';
}

const TONE_BG: Record<NonNullable<KpiCardProps['tone']>, string> = {
  sage: 'bg-sage/10 text-sage-dark',
  terracotta: 'bg-terracotta/10 text-terracotta',
  ink: 'bg-warm text-ink',
};

export function KpiCard({ label, value, hint, icon: Icon, tone = 'sage' }: KpiCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_BG[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      </div>
      <div className="mt-4 font-display text-3xl font-semibold leading-tight text-ink">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-warm/60" />
        <div className="h-9 w-9 rounded-xl bg-warm/60" />
      </div>
      <div className="mt-4 h-9 w-24 rounded bg-warm/60" />
      <div className="mt-2 h-3 w-32 rounded bg-warm/40" />
    </div>
  );
}
