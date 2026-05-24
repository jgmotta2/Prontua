import { Instagram, Mail, Phone } from 'lucide-react';
import {
  IDS_SECAO_LANDING,
  INFORMACOES_CONTATO,
} from '../constants/landing-content';
import { ContactCard } from './ContactCard';

export function ContactSection() {
  const contato = INFORMACOES_CONTATO;

  return (
    <section
      id={IDS_SECAO_LANDING.CONTATO}
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
            <ContactCard
              icone={<Phone className="h-5 w-5" aria-hidden />}
              titulo="Telefone"
            >
              <a
                href={contato.telefoneUri}
                className="font-medium text-sage-dark transition-colors hover:text-ink"
              >
                {contato.telefoneExibicao}
              </a>
            </ContactCard>
          </li>

          <li>
            <ContactCard
              icone={<Mail className="h-5 w-5" aria-hidden />}
              titulo="E-mail"
            >
              <a
                href={`mailto:${contato.email}`}
                className="font-medium text-sage-dark transition-colors hover:text-ink"
              >
                {contato.email}
              </a>
            </ContactCard>
          </li>

          <li className="sm:col-span-2 lg:col-span-1">
            <ContactCard
              icone={<Instagram className="h-5 w-5" aria-hidden />}
              titulo="Instagram"
            >
              <a
                href={contato.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sage-dark transition-colors hover:text-ink"
                aria-label={`Instagram ${contato.instagramRotulo} (abre em nova aba)`}
              >
                {contato.instagramRotulo}
              </a>
            </ContactCard>
          </li>
        </ul>
      </div>
    </section>
  );
}
