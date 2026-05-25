import { z } from 'zod';
import { SessionMode, SessionStatus, PaymentStatus, PaymentMethod, Specialty } from '@prisma/client';

const uuid = z.string().uuid();

// ─── Patient ────────────────────────────────────────────────────────────────

export const createPatientSchema = z
  .object({
    fullName:       z.string().trim().min(2).max(160),
    city:           z.string().trim().min(2).max(80),
    birthDate:      z.coerce.date().optional(),
    email:          z.string().trim().toLowerCase().email().max(255).optional(),
    whatsapp:       z.string().trim().regex(/^\+?\d{10,15}$/),
    document:       z.string().trim().regex(/^\d{11}$/, 'CPF inválido').optional(),
    chiefComplaint: z.string().trim().min(3).max(2000),
    notesGeneral:   z.string().max(1000).optional(),
    tags:           z.array(z.string().max(30)).max(20).default([]),
    sessionValue:   z.number().nonnegative().max(99999.99),
    frequencyTag:   z.enum(['Semanal', 'Quinzenal', 'Mensal']).optional(),
  })
  .strict();

export const patientIdParams = z.object({ id: uuid }).strict();

export const updatePatientSchema = z
  .object({
    fullName:       z.string().trim().min(2).max(160),
    city:           z.string().trim().min(2).max(80),
    birthDate:      z.coerce.date(),
    email:          z.string().trim().toLowerCase().email().max(255),
    whatsapp:       z.string().trim().regex(/^\+?\d{10,15}$/),
    document:       z.string().trim().regex(/^\d{11}$/, 'CPF inválido'),
    chiefComplaint: z.string().trim().min(3).max(2000),
    notesGeneral:   z.string().max(1000),
    tags:           z.array(z.string().max(30)).max(20),
    sessionValue:   z.number().nonnegative().max(99999.99),
    frequencyTag:   z.enum(['Semanal', 'Quinzenal', 'Mensal']),
    active:         z.boolean(),
  })
  .partial()
  .strict();

// ─── Session ─────────────────────────────────────────────────────────────────

export const createSessionSchema = z
  .object({
    patientId:      uuid,
    professionalId: uuid.optional(),
    scheduledAt:    z.coerce.date(),
    durationMin:    z.number().int().min(15).max(240).default(50),
    mode:           z.nativeEnum(SessionMode).default('PRESENCIAL'),
    value:          z.number().nonnegative().max(99999.99),
  })
  .strict();

export const sessionIdParams = z.object({ id: uuid }).strict();

export const updateSessionStatusSchema = z
  .object({ status: z.nativeEnum(SessionStatus) })
  .strict();

export const sessionQuerySchema = z
  .object({
    date:           z.string().optional(),
    from:           z.string().optional(),
    to:             z.string().optional(),
    patientId:      uuid.optional(),
    status:         z.nativeEnum(SessionStatus).optional(),
  })
  .strict();

// ─── Note ────────────────────────────────────────────────────────────────────

export const upsertSessionNoteSchema = z
  .object({
    content:       z.string().max(20_000).optional(),
    nextSteps:     z.string().max(5_000).optional(),
    techniqueUsed: z.string().max(100).optional(),
    patientMood:   z.number().int().min(1).max(5).optional(),
  })
  .strict();

export const sessionNoteParamsSchema = z.object({ sessionId: uuid }).strict();

export const patientIdForNotesParams = z.object({ patientId: uuid }).strict();

// ─── Payment ─────────────────────────────────────────────────────────────────

export const paymentIdParams = z.object({ id: uuid }).strict();

export const updatePaymentSchema = z
  .object({
    status:  z.nativeEnum(PaymentStatus),
    method:  z.nativeEnum(PaymentMethod).optional(),
    paidAt:  z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
  })
  .strict();

// ─── User / Settings ─────────────────────────────────────────────────────────

export const updateUserSchema = z
  .object({
    name:      z.string().trim().min(2).max(120),
    whatsapp:  z.string().trim().regex(/^\+?\d{10,15}$/),
    city:      z.string().trim().min(2).max(80),
    state:     z.string().length(2).toUpperCase(),
    specialty: z.nativeEnum(Specialty),
    registry:  z.string().max(30).nullable(),
  })
  .partial()
  .strict();

const passwordPolicy = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(128, 'Senha excede o tamanho máximo')
  .refine((s) => /[a-z]/.test(s), 'Senha deve conter letra minúscula')
  .refine((s) => /[A-Z]/.test(s), 'Senha deve conter letra maiúscula')
  .refine((s) => /\d/.test(s), 'Senha deve conter número');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword:     passwordPolicy,
  })
  .strict();

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreatePatientInput  = z.infer<typeof createPatientSchema>;
export type CreateSessionInput  = z.infer<typeof createSessionSchema>;
export type UpsertNoteInput     = z.infer<typeof upsertSessionNoteSchema>;
export type UpsertNoteBody      = Required<UpsertNoteInput>;
