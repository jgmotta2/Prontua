import type { ReactNode } from 'react';

interface ContactCardProps {
  icone: ReactNode;
  titulo: string;
  children: ReactNode;
}

export function ContactCard({ icone, titulo, children }: ContactCardProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-sage/15 bg-white p-6 text-center shadow-soft">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
        {icone}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{titulo}</h3>
      <div className="mt-2 text-sm text-muted">{children}</div>
    </div>
  );
}
