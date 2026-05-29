import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ctaEmailSchema,
  type CtaEmailFormValues,
} from '@lib/validation/landing.schema';

export function useCtaEmailForm() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<CtaEmailFormValues>({
    resolver: zodResolver(ctaEmailSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(() => {
    // TODO: POST /api/waitlist quando o endpoint existir
    setSubmitted(true);
    form.reset();
  });

  return {
    form,
    onSubmit,
    submitted,
  };
}
