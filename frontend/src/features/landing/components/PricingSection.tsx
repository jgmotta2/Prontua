import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { IDS_SECAO_LANDING, PLANOS } from '../constants/landing-content';

export function PricingSection() {
  return (
    <section
      id={IDS_SECAO_LANDING.PLANOS}
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
          {PLANOS.map((plano) => (
            <li
              key={plano.id}
              className={[
                'flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft',
                plano.destaque ? 'ring-2 ring-sage' : '',
              ].join(' ')}
            >
              <div
                className={[
                  'p-6',
                  plano.destaque ? 'bg-sage text-cream' : 'border-b border-sage/10',
                ].join(' ')}
              >
                <p
                  className={[
                    'text-sm font-medium',
                    plano.destaque ? 'opacity-90' : 'text-muted',
                  ].join(' ')}
                >
                  {plano.subtitulo}
                </p>
                <h3
                  className={[
                    'mt-1 font-display text-2xl font-semibold',
                    plano.destaque ? 'text-cream' : 'text-ink',
                  ].join(' ')}
                >
                  {plano.nome}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plano.preco}</span>
                  <span
                    className={[
                      'text-sm',
                      plano.destaque ? 'opacity-80' : 'text-muted',
                    ].join(' ')}
                  >
                    {plano.periodo}
                  </span>
                </div>
              </div>

              <ul className="flex-1 space-y-3 p-6">
                {plano.recursos.map((recurso) => (
                  <li key={recurso} className="flex items-start gap-3 text-sm text-ink">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-sage-dark"
                      aria-hidden
                    />
                    {recurso}
                  </li>
                ))}
              </ul>

              <div className="p-6 pt-0">
                {plano.disponivel ? (
                  <Link
                    to="/cadastro"
                    className={plano.destaque ? 'btn-primary w-full' : 'btn-secondary w-full'}
                  >
                    {plano.id === 'trial' ? 'Começar teste grátis' : 'Criar conta'}
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
