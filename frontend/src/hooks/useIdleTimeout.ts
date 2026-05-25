import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_MS      = 15 * 60 * 1000; // 15 minutos → logout
const WARNING_MS   = 14 * 60 * 1000; // 14 minutos → aviso
const DEBOUNCE_MS  = 500;            // throttle dos event listeners

interface UseIdleTimeoutOptions {
  onIdle: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({ onIdle, enabled = true }: UseIdleTimeoutOptions) {
  const [showWarning, setShowWarning]     = useState(false);
  const [countdown, setCountdown]         = useState(60);

  const idleTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = useCallback(() => {
    if (idleTimer.current)     clearTimeout(idleTimer.current);
    if (warnTimer.current)     clearTimeout(warnTimer.current);
    if (countdownRef.current)  clearInterval(countdownRef.current);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    clearAll();
    setShowWarning(false);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();

      idleTimer.current = setTimeout(() => {
        setShowWarning(false);
        onIdle();
      }, IDLE_MS - WARNING_MS);
    }, WARNING_MS);
  }, [enabled, clearAll, startCountdown, onIdle]);

  // "Continuar Trabalhando" — reset completo
  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(resetTimers, DEBOUNCE_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleActivity();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);

    resetTimers();

    return () => {
      clearAll();
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, resetTimers, clearAll]);

  return { showWarning, countdown, extendSession };
}
