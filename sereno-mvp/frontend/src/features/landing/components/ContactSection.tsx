import { Instagram, Mail, Phone } from 'lucide-react';
import { CONTACT_INFO, LANDING_SECTION_IDS } from '../constants/landing-content';
import { ContactCard } from './ContactCard';

export function ContactSection() {
  const contact = CONTACT_INFO;

  return (
    <section
      id={LANDING_SECTION_IDS.CONTACT}
      className="scroll-mt-28 border-t border-sage/10 bg-white/50 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Contato
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Tire dúvidas ou fale com nossa equipe pelos canais abaixo.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <ContactCard icon={<Phone className="h-5 w-5" aria-hidden />} title="Telefone">
              <a
                href={contact.phoneUri}
                className="font-medium text-sage-dark transition-colors hover:text-ink"
              >
                {contact.phoneDisplay}
              </a>
            </ContactCard>
          </li>

          <li>
            <ContactCard icon={<Mail className="h-5 w-5" aria-hidden />} title="E-mail">
              <a
                href={`mailto:${contact.email}`}
                className="font-medium text-sage-dark transition-colors hover:text-ink"
              >
                {contact.email}
              </a>
            </ContactCard>
          </li>

          <li className="sm:col-span-2 lg:col-span-1">
            <ContactCard icon={<Instagram className="h-5 w-5" aria-hidden />} title="Instagram">
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sage-dark transition-colors hover:text-ink"
                aria-label={`Instagram ${contact.instagramHandle} (abre em nova aba)`}
              >
                {contact.instagramHandle}
              </a>
            </ContactCard>
          </li>
        </ul>
      </div>
    </section>
  );
}
