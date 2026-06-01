import { z } from 'zod';

const uuid = z.string().uuid();

export const createPatientSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160),
    birthDate: z.coerce.date().optional(),
    email: z.string().trim().toLowerCase().email().max(255).optional(),
    whatsapp: z.string().trim().regex(/^\+?\d{10,15}$/),
    document: z.string().trim().regex(/^\d{11}$/, 'CPF inválido').optional(),
    notesGeneral: z.string().max(2000).optional(),
    tags: z.array(z.string().max(30)).max(20).default([]),
    sessionValue: z.number().min(0.01, 'Valor deve ser maior que zero').max(99999.99),
    frequencyTag: z.enum(['Semanal', 'Quinzenal', 'Mensal']).optional(),
  })
  .strict();

export const patientIdParams = z.object({ id: uuid }).strict();

export const createSessionSchema = z
  .object({
    patientId: uuid,
    professionalId: uuid.optional(),
    scheduledAt: z.coerce.date(),
    durationMin: z.number().int().min(15).max(240).default(50),
    mode: z.enum(['PRESENCIAL', 'ONLINE']).default('PRESENCIAL'),
    value: z.number().min(0.01, 'Valor deve ser maior que zero').max(99999.99),
    // Recorrência: cria N sessões com intervalo semanal ou quinzenal
    repeat: z.object({
      every: z.enum(['week', 'biweekly']),
      times: z.number().int().min(2).max(52),
    }).optional(),
  })
  .strict();

export const updateSessionStatusSchema = z
  .object({
    status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW']),
  })
  .strict();

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
