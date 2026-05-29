import { useEffect, useState } from 'react';

const KEY = 'prontua_dark_mode';

function getInitial(): boolean {
  const stored = localStorage.getItem(KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try { return getInitial(); } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(KEY, String(dark));
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
