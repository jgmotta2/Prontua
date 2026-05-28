import { Check, X } from 'lucide-react';
import {
  ITENS_PUBLICO_NEGATIVO,
  ITENS_PUBLICO_POSITIVO,
} from '../constants/landing-content';

export function AudienceSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Para quem é o Prontua
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-sage/20 bg-white p-6 shadow-soft">
            <h3 className="font-display text-xl font-semibold text-sage-dark">
              É para você se
            </h3>
            <ul className="mt-4 space-y-3">
              {ITENS_PUBLICO_POSITIVO.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-dark" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-warm bg-warm/30 p-6">
            <h3 className="font-display text-xl font-semibold text-muted">
              Não é para você se
            </h3>
            <ul className="mt-4 space-y-3">
              {ITENS_PUBLICO_NEGATIVO.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted">
                  <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
