import { HEADER_NAV_LINKS } from '../constants/landing-content';

const SECTION_LINK_CLASS =
  'text-sm font-medium text-muted transition-colors hover:text-ink';

export function LandingHeaderNav() {
  return (
    <nav
      className="hidden items-center justify-center gap-6 lg:flex"
      aria-label="Seções da página inicial"
    >
      {HEADER_NAV_LINKS.map((link) => (
        <a
          key={link.sectionId}
          href={`#${link.sectionId}`}
          className={SECTION_LINK_CLASS}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
