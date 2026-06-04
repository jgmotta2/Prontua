import { Quote } from 'lucide-react';
import { LANDING_SECTION_IDS, TESTIMONIALS } from '../constants/landing-content';

export function TestimonialsSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.FEEDBACKS}
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
          {TESTIMONIALS.map((testimonial) => (
            <li
              key={testimonial.author}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-soft"
            >
              <Quote className="h-8 w-8 text-sage/40" aria-hidden />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">
                &ldquo;{testimonial.text}&rdquo;
              </blockquote>
              <footer className="mt-6 border-t border-sage/10 pt-4">
                <cite className="not-italic font-medium text-ink">
                  {testimonial.author}
                </cite>
                <p className="text-xs text-muted">{testimonial.location}</p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
