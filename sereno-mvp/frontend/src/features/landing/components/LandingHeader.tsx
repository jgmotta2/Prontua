import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LandingHeaderNav } from './LandingHeaderNav';

function scrollToTop(): void {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  window.scrollTo({ top: 0, behavior });
}

export function LandingHeader() {
  const location = useLocation();

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (location.pathname !== '/') {
      return;
    }
    event.preventDefault();
    if (location.hash) {
      window.history.replaceState(null, '', '/');
    }
    scrollToTop();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-sage/10 bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-20">
        <Link
          to="/"
          onClick={handleLogoClick}
          className="shrink-0"
          aria-label="Prontua — voltar ao início"
        >
          <img
            src="/assets/LogoProntua.svg"
            alt=""
            className="h-12 w-auto sm:h-10 lg:h-14"
          />
        </Link>

        <LandingHeaderNav />

        <nav
          className="flex items-center justify-end gap-2 sm:gap-3"
          aria-label="Ações da página inicial"
        >
          <a
            href="/app.html"
            className="btn-secondary px-4 py-2 text-sm sm:px-5 sm:py-2.5"
          >
            Entrar
          </a>
          <a
            href="/app.html"
            className="btn-primary px-4 py-2 text-sm sm:px-5 sm:py-2.5"
          >
            Criar conta
          </a>
        </nav>
      </div>
    </header>
  );
}
