import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ctaEmailSchema,
  type CtaEmailFormValues,
} from '@lib/validation/landing.schema';
import { useInscreverListaEspera } from './useInscreverListaEspera';

export function useCtaEmailForm() {
  const [submitted, setSubmitted] = useState(false);
  const inscrever = useInscreverListaEspera();

  const form = useForm<CtaEmailFormValues>({
    resolver: zodResolver(ctaEmailSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (valores) => {
    try {
      await inscrever.mutateAsync({ email: valores.email });
      setSubmitted(true);
      form.reset();
    } catch {
      /* erro exposto via submitError */
    }
  });

  return {
    form,
    onSubmit,
    submitted,
    isSubmitting: inscrever.isPending,
    submitError: inscrever.error?.message ?? null,
  };
}
