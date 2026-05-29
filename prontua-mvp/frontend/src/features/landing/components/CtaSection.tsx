import { CtaEmailForm } from './CtaEmailForm';

export function CtaSection() {
  return (
    <section className="border-t border-sage/10 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl rounded-2xl bg-ink px-6 py-12 text-center text-cream sm:px-12">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">
          Pronto para organizar sua clínica?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-cream/75">
          Junte prontuário seguro, agenda e financeiro em um sistema feito para
          quem atende com responsabilidade ética e técnica.
        </p>
        <CtaEmailForm />
      </div>
    </section>
  );
}
