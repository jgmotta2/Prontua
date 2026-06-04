import { FaqAccordion } from '@components/ui/FaqAccordion';
import { FAQ_ITEMS, LANDING_SECTION_IDS } from '../constants/landing-content';

export function FaqSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.FAQ}
      className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <FaqAccordion
              key={item.question}
              question={item.question}
              answer={item.answer}
              initiallyOpen={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
