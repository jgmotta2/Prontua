import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  Settings,
  LogOut,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLogout } from '@features/auth/hooks/useLogin';

const NAV_ITEMS = [
  { to: '/painel',      label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/pacientes',  label: 'Pacientes',    icon: Users },
  { to: '/agenda',     label: 'Agenda',       icon: CalendarDays },
  { to: '/financeiro', label: 'Financeiro',   icon: Wallet },
  { to: '/config',     label: 'Configurações',icon: Settings },
] as const;

export function Sidebar() {
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
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-ink text-cream/85">
      <div className="px-6 py-5">
        <div className="w-36 h-20 flex items-center">
          <img src="/assets/ProntuaSilverLogo.svg" alt="Logo" className='' />
        </div>
        <p className=" pt-2 text-xs text-cream/50">Bem-vindo de volta</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/painel'}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                isActive
                  ? 'bg-sage/20 text-cream font-medium'
                  : 'text-cream/70 hover:bg-white/5 hover:text-cream',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        disabled={logout.isPending}
        className="mx-3 mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                   text-cream/60 transition hover:bg-white/5 hover:text-cream disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.8} />
        {logout.isPending ? 'Saindo...' : 'Sair'}
      </button>
    </aside>
  );
}
