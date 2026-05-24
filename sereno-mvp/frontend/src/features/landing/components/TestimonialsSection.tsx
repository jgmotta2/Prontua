import { Quote } from 'lucide-react';
import {
  DEPOIMENTOS,
  IDS_SECAO_LANDING,
} from '../constants/landing-content';

export function TestimonialsSection() {
  return (
    <section
      id={IDS_SECAO_LANDING.FEEDBACKS}
      className="scroll-mt-28 border-t border-sage/10 bg-white/50 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Quem já usa no dia a dia
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Profissionais que valorizam organização e sigilo clínico.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {DEPOIMENTOS.map((depoimento) => (
            <li
              key={depoimento.autor}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-soft"
            >
              <Quote className="h-8 w-8 text-sage/40" aria-hidden />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">
                &ldquo;{depoimento.texto}&rdquo;
              </blockquote>
              <footer className="mt-6 border-t border-sage/10 pt-4">
                <cite className="not-italic font-medium text-ink">
                  {depoimento.autor}
                </cite>
                <p className="text-xs text-muted">{depoimento.local}</p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
