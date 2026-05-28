import { type ReactNode, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@lib/api/client';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { BottomNav } from './BottomNav';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

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
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
        navigate('/entrar', { replace: true });
      }, IDLE_TIMEOUT_MS);
    };

    reset();
    IDLE_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate]);

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
