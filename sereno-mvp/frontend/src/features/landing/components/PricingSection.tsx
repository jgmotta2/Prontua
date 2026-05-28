import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LANDING_SECTION_IDS, PRICING_PLANS } from '../constants/landing-content';

export function PricingSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.PRICING}
      className="scroll-mt-28 border-t border-sage/10 bg-white/50 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Planos sem enrolação
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Comece grátis. Assine quando o Prontua fizer parte da sua rotina.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-2 md:max-w-3xl md:mx-auto">
          {PRICING_PLANS.map((plan) => (
            <li
              key={plan.id}
              className={[
                'flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft',
                plan.highlighted ? 'ring-2 ring-sage' : '',
              ].join(' ')}
            >
              <div
                className={[
                  'p-6',
                  plan.highlighted ? 'bg-sage text-cream' : 'border-b border-sage/10',
                ].join(' ')}
              >
                <p
                  className={[
                    'text-sm font-medium',
                    plan.highlighted ? 'opacity-90' : 'text-muted',
                  ].join(' ')}
                >
                  {plan.subtitle}
                </p>
                <h3
                  className={[
                    'mt-1 font-display text-2xl font-semibold',
                    plan.highlighted ? 'text-cream' : 'text-ink',
                  ].join(' ')}
                >
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span
                    className={[
                      'text-sm',
                      plan.highlighted ? 'opacity-80' : 'text-muted',
                    ].join(' ')}
                  >
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="flex-1 space-y-3 p-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-ink">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-sage-dark"
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="p-6 pt-0">
                {plan.available ? (
                  <Link
                    to="/cadastro"
                    className={plan.highlighted ? 'btn-primary w-full' : 'btn-secondary w-full'}
                  >
                    {plan.id === 'trial' ? 'Começar teste grátis' : 'Criar conta'}
                  </Link>
                ) : (
                  <span className="btn-secondary w-full pointer-events-none opacity-60">
                    Em breve
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
