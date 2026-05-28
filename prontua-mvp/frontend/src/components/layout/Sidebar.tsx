import { NavLink, Link, useNavigate } from 'react-router-dom';
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
import { useSession } from '@features/auth/hooks/useSession';

const NAV_ITEMS = [
  { to: '/painel',     label: 'Dashboard',    icon: LayoutDashboard, id: undefined },
  { to: '/pacientes',  label: 'Pacientes',    icon: Users,           id: 'tour-nav-pacientes' },
  { to: '/agenda',     label: 'Agenda',       icon: CalendarDays,    id: 'tour-nav-agenda' },
  { to: '/financeiro', label: 'Financeiro',   icon: Wallet,          id: 'tour-nav-financeiro' },
  { to: '/config',     label: 'Configurações',icon: Settings,        id: undefined },
] as const;

export function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      queryClient.clear();
      navigate('/entrar', { replace: true });
    }
  };

  // Iniciais para o avatar de fallback
  const initials = session?.name
    ? session.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => (n[0] ?? '').toUpperCase())
        .join('')
    : '?';

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-ink text-cream/85">
      <div className="px-6 py-7">
        <h1 className="font-display text-2xl font-semibold text-cream tracking-tight">Prontua</h1>
        <p className="mt-0.5 text-xs text-cream/50">Bem-vindo de volta</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, id }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/painel'}
            id={id}
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

      {/* Avatar + nome do usuário */}
      {session && (
        <Link to="/config" className="mx-3 mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-sage/30 flex items-center justify-center">
            {session.photo ? (
              <img
                src={session.photo}
                alt={session.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-cream">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-cream">{session.name}</p>
            <p className="truncate text-xs text-cream/50 capitalize">{(session.role ?? '').toLowerCase()}</p>
          </div>
        </Link>
      )}

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
