import { z } from 'zod';

export const ctaEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(255),
});

export type CtaEmailFormValues = z.infer<typeof ctaEmailSchema>;
