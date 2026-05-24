import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-display text-4xl font-semibold text-ink tracking-tight">Prontua</h1>
          <p className="text-sm text-muted mt-1">
            Gestão de clínicas com privacidade por design
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-soft">
          {children}
        </div>

        <p className="text-center text-[11px] text-muted mt-6">
          Em conformidade com LGPD e Código de Ética do CFP.
        </p>
      </div>
    </div>
  );
}
