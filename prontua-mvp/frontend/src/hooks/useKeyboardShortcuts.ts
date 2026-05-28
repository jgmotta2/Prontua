import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutOptions {
  onOpenSearch: () => void;
  onNewSession: () => void;
}

export function useKeyboardShortcuts({ onOpenSearch, onNewSession }: ShortcutOptions) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const editing = tag === 'input' || tag === 'textarea' || tag === 'select'
        || (e.target as HTMLElement).isContentEditable;

      // Atalhos só fora de campos de texto
      if (editing) return;

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onOpenSearch();
        return;
      }

      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onNewSession();
        return;
      }

      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        navigate('/pacientes');
        return;
      }

      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        navigate('/agenda');
        return;
      }

      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        navigate('/financeiro');
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onOpenSearch, onNewSession]);
}
