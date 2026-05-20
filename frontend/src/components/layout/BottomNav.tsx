import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',           label: 'Início',     icon: LayoutDashboard },
  { to: '/pacientes',  label: 'Pacientes',  icon: Users },
  { to: '/agenda',     label: 'Agenda',     icon: CalendarDays },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/config',     label: 'Config',     icon: Settings },
] as const;

/**
 * Bottom navigation fixa para mobile.
 *
 * - `md:hidden` esconde em desktop (onde a Sidebar assume).
 * - `safe-area-inset-bottom` reserva espaço para o home indicator do iOS.
 * - `backdrop-blur` mantém legibilidade quando o conteúdo passa por baixo.
 */
export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40
                 border-t border-warm/60 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <ul className="flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 py-2.5 px-1 min-h-[56px] justify-center transition',
                  isActive ? 'text-sage-dark' : 'text-muted active:bg-warm/30',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 transition ${isActive ? 'scale-110' : ''}`}
                    strokeWidth={1.8}
                  />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
