import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { BottomNav } from './BottomNav';

/**
 * Layout principal das rotas autenticadas.
 *
 * Desktop (≥ md): Sidebar fixa à esquerda + conteúdo scrollável.
 * Mobile  (< md): MobileTopBar no topo + BottomNav fixo no rodapé.
 *
 * `pb-20` no main garante que o conteúdo da última seção não fique
 * obscurecido pelo BottomNav fixo em mobile.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-cream">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
