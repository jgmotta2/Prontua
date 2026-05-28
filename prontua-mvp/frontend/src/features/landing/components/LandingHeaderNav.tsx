import { LINKS_NAVEGACAO_HEADER } from '../constants/landing-content';

const CLASSE_LINK_SECAO =
  'text-sm font-medium text-muted transition-colors hover:text-ink';

export function LandingHeaderNav() {
  return (
    <nav
      className="hidden items-center justify-center gap-6 lg:flex"
      aria-label="Seções da página inicial"
    >
      {LINKS_NAVEGACAO_HEADER.map((link) => (
        <a
          key={link.idSecao}
          href={`#${link.idSecao}`}
          className={CLASSE_LINK_SECAO}
        >
          {link.rotulo}
        </a>
      ))}
    </nav>
  );
}
