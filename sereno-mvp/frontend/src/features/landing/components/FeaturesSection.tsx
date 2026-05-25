import {
  FUNCIONALIDADES,
  IDS_SECAO_LANDING,
} from '../constants/landing-content';

export function FeaturesSection() {
  return (
    <section
      id={IDS_SECAO_LANDING.FUNCIONALIDADES}
      className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            O que o Prontua faz de verdade
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Ferramentas pensadas para consultórios, não sistemas genéricos de hospital.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONALIDADES.map((item) => {
            const Icon = item.icone;
            return (
              <li
                key={item.titulo}
                className="rounded-2xl bg-white p-6 shadow-soft transition hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sage/10 text-sage-dark">
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                  {item.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.descricao}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
