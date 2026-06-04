import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { api } from '@lib/api/client';
import { useSession } from '@features/auth/hooks/useSession';
import { ADMIN_LISTA_ESPERA } from '../constants/admin-content';

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sessao } = useSession();

  const handleSair = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignora falha de rede no logout */
    }
    queryClient.clear();
    navigate('/entrar', { replace: true });
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-warm bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sage-dark">
              {ADMIN_LISTA_ESPERA.marca}
            </p>
            {sessao?.name ? (
              <p className="text-sm text-muted">{sessao.name}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleSair()}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {ADMIN_LISTA_ESPERA.sair}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
