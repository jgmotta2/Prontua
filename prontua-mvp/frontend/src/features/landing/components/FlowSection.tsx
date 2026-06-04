import { FLOW_STEPS } from '../constants/landing-content';

export function FlowSection() {
  return (
    <section id="como-funciona" className="border-t border-sage/10 bg-white/50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Como o Prontua organiza seu dia
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Três passos simples do agendamento ao prontuário seguro.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {FLOW_STEPS.map((step) => (
            <li
              key={step.order}
              className="relative rounded-2xl bg-white p-6 shadow-soft"
            >
              <span
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sage/10 font-display text-lg font-semibold text-sage-dark"
                aria-hidden
              >
                {step.order}
              </span>
              <h3 className="font-display text-xl font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
