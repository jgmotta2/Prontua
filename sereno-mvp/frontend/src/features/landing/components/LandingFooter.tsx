import {
  BRAND_TAGLINE,
  BRAND_TITLE,
  LANDING_SECTION_IDS,
} from '../constants/landing-content';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-sage/10 bg-white/40 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="font-display text-xl font-semibold text-ink">{BRAND_TITLE}</p>
          <p className="mt-1 text-sm text-muted">{BRAND_TAGLINE}</p>
        </div>

        <nav
          className="flex flex-wrap items-center justify-center gap-4 text-sm"
          aria-label="Links do rodapé"
        >
          <a href="/app.html" className="text-muted hover:text-sage-dark transition">
            Entrar
          </a>
          <a href="/app.html" className="text-muted hover:text-sage-dark transition">
            Criar conta
          </a>
          <a
            href={`#${LANDING_SECTION_IDS.FAQ}`}
            className="text-muted hover:text-sage-dark transition"
          >
            FAQ
          </a>
          <a
            href={`#${LANDING_SECTION_IDS.PRICING}`}
            className="text-muted hover:text-sage-dark transition"
          >
            Planos
          </a>
          <a
            href={`#${LANDING_SECTION_IDS.CONTACT}`}
            className="text-muted hover:text-sage-dark transition"
          >
            Contato
          </a>
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-muted">
        © {currentYear} {BRAND_TITLE}. Em conformidade com LGPD e Código de Ética do CFP.
      </p>
    </footer>
  );
}
