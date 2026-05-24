import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLogout } from '@features/auth/hooks/useLogin';

export function MobileTopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useLogout();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      queryClient.clear();
      navigate('/entrar', { replace: true });
    }
  };

  return (
    <header className="md:hidden flex items-center justify-between border-b border-warm/40 bg-cream px-5 py-3">
      <h1 className="font-display text-xl font-semibold text-ink">Prontua</h1>
      <button
        type="button"
        onClick={handleLogout}
        disabled={logout.isPending}
        className="p-2 text-muted hover:text-ink transition"
        aria-label="Sair"
      >
        <LogOut className="h-5 w-5" strokeWidth={1.8} />
      </button>
    </header>
  );
}
