import { ArrowRight } from 'lucide-react';
import { LANDING_CTA_EMAIL } from '../constants/landing-content';
import { useCtaEmailForm } from '../hooks/useCtaEmailForm';

export function CtaEmailForm() {
  const { form, onSubmit, submitted, isSubmitting, submitError } = useCtaEmailForm();
  const {
    register,
    formState: { errors },
  } = form;

  if (submitted) {
    return (
      <p
        role="status"
        className="mx-auto mt-8 max-w-lg rounded-xl border border-sage/30 bg-sage/15 px-4 py-3 text-sm text-cream"
      >
        {LANDING_CTA_EMAIL.successMessage}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-8 max-w-lg text-left"
      noValidate
    >
      <p className="mb-5 text-center text-base font-semibold text-cream sm:text-lg">
        <span className="inline-block rounded-full bg-sage/25 px-4 py-2 ring-1 ring-sage/40">
          {LANDING_CTA_EMAIL.launchNotice}
        </span>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="cta-email" className="sr-only">
            {LANDING_CTA_EMAIL.emailLabel}
          </label>
          <input
            id="cta-email"
            type="email"
            autoComplete="email"
            placeholder={LANDING_CTA_EMAIL.placeholderEmail}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'cta-email-error' : undefined}
            className={`input bg-cream text-ink placeholder:text-muted ${
              errors.email ? 'input-error' : ''
            }`}
            {...register('email')}
          />
          {errors.email ? (
            <p id="cta-email-error" className="helper-error mt-1.5 text-cream/90">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary shrink-0 bg-sage hover:bg-sage-dark sm:mt-0 disabled:opacity-60"
        >
          {LANDING_CTA_EMAIL.submitLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {submitError ? (
        <p role="alert" className="helper-error mt-3 text-center text-cream/90">
          {LANDING_CTA_EMAIL.errorMessage}
        </p>
      ) : null}
    </form>
  );
}
