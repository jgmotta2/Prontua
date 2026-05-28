import { type ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@lib/api/client';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { BottomNav } from './BottomNav';
import { GlobalSearch } from '@components/GlobalSearch';
import { AppTour } from '@components/AppTour';
import { useDarkMode } from '@hooks/useDarkMode';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { SessionModal } from '@features/sessions/components/SessionModal';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { dark, toggle: toggleDark } = useDarkMode();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openNewSession = useCallback(() => setNewSessionOpen(true), []);

  useKeyboardShortcuts({ onOpenSearch: openSearch, onNewSession: openNewSession });

  // Idle timeout — logout automático após 30 min sem interação
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
      <Sidebar dark={dark} onToggleDark={toggleDark} onOpenSearch={openSearch} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTopBar onOpenSearch={openSearch} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SessionModal open={newSessionOpen} onClose={() => setNewSessionOpen(false)} />
      <AppTour />
    </div>
  );
}
