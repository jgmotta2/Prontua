import { z } from 'zod';

const specialtyValues = ['PSICOLOGIA','FISIOTERAPIA','FONOAUDIOLOGIA','PSICOPEDAGOGIA','NUTRICAO','TERAPIA_OCUPACIONAL','OUTRA'] as const;

/**
 * Schemas Zod usados pelo middleware de validação.
 *
 * .strict() em todos os objetos rejeita campos extras (defesa contra
 * mass assignment — ex: cliente tentando setar role=OWNER no register).
 */

const passwordPolicy = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(128, 'Senha excede o tamanho máximo')
  .refine((s) => /[a-z]/.test(s), 'Senha deve conter letra minúscula')
  .refine((s) => /[A-Z]/.test(s), 'Senha deve conter letra maiúscula')
  .refine((s) => /\d/.test(s), 'Senha deve conter número');

const brStateCodes = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

// WhatsApp brasileiro em E.164: +55 + DDD(2) + 9 dígitos celular
const whatsappBr = z
  .string()
  .transform((s) => s.replace(/\D/g, ''))
  .refine((s) => /^(55)?\d{10,11}$/.test(s), 'WhatsApp inválido')
  .transform((s) => (s.startsWith('55') ? `+${s}` : `+55${s}`));

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'Nome muito curto').max(120),
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(255),
    password: passwordPolicy,
    whatsapp: whatsappBr,
    city: z.string().trim().min(2).max(80),
    state: z.enum(brStateCodes),
    specialty: z.enum(specialtyValues),
    clinicName: z.string().trim().min(2).max(120).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(1).max(128),
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
  })
  .strict();

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(20).max(200),
    newPassword: passwordPolicy,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name:      z.string().trim().min(3).max(120).optional(),
    whatsapp:  whatsappBr.optional(),
    city:      z.string().trim().min(2).max(80).optional(),
    state:     z.enum(brStateCodes).optional(),
    specialty: z.enum(specialtyValues).optional(),
    registry:  z.string().trim().max(50).optional().nullable(),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordPolicy,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
