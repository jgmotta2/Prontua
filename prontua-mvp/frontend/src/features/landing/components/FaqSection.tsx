import { FaqAccordion } from '@components/ui/FaqAccordion';
import {
  IDS_SECAO_LANDING,
  PERGUNTAS_FREQUENTES,
} from '../constants/landing-content';

export function FaqSection() {
  return (
    <section
      id={IDS_SECAO_LANDING.FAQ}
      className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {PERGUNTAS_FREQUENTES.map((item, index) => (
            <FaqAccordion
              key={item.pergunta}
              question={item.pergunta}
              answer={item.resposta}
              initiallyOpen={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
