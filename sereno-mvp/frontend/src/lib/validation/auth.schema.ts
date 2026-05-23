import { z } from 'zod';

/**
 * Schemas Zod para validação client-side antes de chamar o backend.
 *
 * IMPORTANTE: o backend revalida com Zod equivalente. Validação client-side
 * é apenas UX — nunca é a única linha de defesa.
 *
 * Para evitar duplicação, em projetos maiores um package compartilhado
 * (ex: `@sereno/contracts`) com schemas + types exportados é o caminho.
 */

const passwordPolicy = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128)
  .refine((s) => /[a-z]/.test(s), 'Deve conter letra minúscula')
  .refine((s) => /[A-Z]/.test(s), 'Deve conter letra maiúscula')
  .refine((s) => /\d/.test(s), 'Deve conter número');

export const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

export const SPECIALTIES = [
  'PSICOLOGIA',
  'FISIOTERAPIA',
  'FONOAUDIOLOGIA',
  'PSICOPEDAGOGIA',
  'NUTRICAO',
  'TERAPIA_OCUPACIONAL',
  'OUTRA',
] as const;

const whatsappBr = z
  .string()
  .min(1, 'Obrigatório')
  .refine((s) => /^(\+?55)?[\s(]*\d{2}[\s)]*\d{4,5}[-\s]?\d{4}$/.test(s.trim()), 'WhatsApp inválido');

export const registerSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(255),
  password: passwordPolicy,
  whatsapp: whatsappBr,
  city: z.string().trim().min(2, 'Obrigatório').max(80),
  state: z.enum(BR_STATES, { errorMap: () => ({ message: 'Selecione um estado' }) }),
  specialty: z.enum(SPECIALTIES, { errorMap: () => ({ message: 'Selecione a especialidade' }) }),
  clinicName: z.string().trim().min(2).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
