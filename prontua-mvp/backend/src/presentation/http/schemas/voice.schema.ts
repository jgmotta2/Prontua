import { z } from 'zod';

export const consentParamsSchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido'),
}).strict();

export const reportParamsSchema = z.object({
  reportId: z.string().uuid('ID de relatório inválido'),
}).strict();

export const sessionReportParamsSchema = z.object({
  sessionId: z.string().uuid('ID de sessão inválido'),
}).strict();

export const updateReportBodySchema = z.object({
  structuredReport: z.string().min(10, 'Conteúdo muito curto').max(100_000),
}).strict();

export type ConsentParams        = z.infer<typeof consentParamsSchema>;
export type ReportParams         = z.infer<typeof reportParamsSchema>;
export type SessionReportParams  = z.infer<typeof sessionReportParamsSchema>;
export type UpdateReportBody     = z.infer<typeof updateReportBodySchema>;
