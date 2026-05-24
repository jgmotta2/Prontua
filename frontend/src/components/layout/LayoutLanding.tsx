import type { ReactNode } from 'react';

interface LayoutLandingProps {
  children: ReactNode;
}

export function LayoutLanding({ children }: LayoutLandingProps) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {children}
    </div>
  );
}
