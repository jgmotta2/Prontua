/**
 * Constantes de enum que substituem os tipos Prisma (usados no SQLite dev).
 * Em produção (PostgreSQL) estes seriam os enum types do @prisma/client.
 */

export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  PROFESSIONAL: 'PROFESSIONAL',
  ASSISTANT: 'ASSISTANT',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const Specialty = {
  PSICOLOGIA: 'PSICOLOGIA',
  FISIOTERAPIA: 'FISIOTERAPIA',
  FONOAUDIOLOGIA: 'FONOAUDIOLOGIA',
  PSICOPEDAGOGIA: 'PSICOPEDAGOGIA',
  NUTRICAO: 'NUTRICAO',
  TERAPIA_OCUPACIONAL: 'TERAPIA_OCUPACIONAL',
  OUTRA: 'OUTRA',
} as const;
export type Specialty = typeof Specialty[keyof typeof Specialty];

export const SessionStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];

export const SessionMode = {
  PRESENCIAL: 'PRESENCIAL',
  ONLINE: 'ONLINE',
} as const;
export type SessionMode = typeof SessionMode[keyof typeof SessionMode];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELED: 'CANCELED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export const PaymentMethod = {
  PIX: 'PIX',
  CARD: 'CARD',
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

export const AuditAction = {
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_REGISTER: 'AUTH_REGISTER',
  AUTH_PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
  AUTH_PASSWORD_RESET_CONFIRM: 'AUTH_PASSWORD_RESET_CONFIRM',
  AUTH_TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  AUTH_MFA_INITIATED: 'AUTH_MFA_INITIATED',
  AUTH_MFA_FAILED: 'AUTH_MFA_FAILED',
  AUTH_REFRESH_TOKEN_REUSE: 'AUTH_REFRESH_TOKEN_REUSE',
  PATIENT_VIEW: 'PATIENT_VIEW',
  PATIENT_CREATE: 'PATIENT_CREATE',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_DELETE: 'PATIENT_DELETE',
  SESSION_CREATE: 'SESSION_CREATE',
  SESSION_UPDATE: 'SESSION_UPDATE',
  SESSION_DELETE: 'SESSION_DELETE',
  NOTE_VIEW: 'NOTE_VIEW',
  NOTE_CREATE: 'NOTE_CREATE',
  NOTE_UPDATE: 'NOTE_UPDATE',
  NOTE_DELETE: 'NOTE_DELETE',
  PAYMENT_CREATE: 'PAYMENT_CREATE',
  PAYMENT_UPDATE: 'PAYMENT_UPDATE',
  WHATSAPP_SEND: 'WHATSAPP_SEND',
  EXPORT_REQUEST: 'EXPORT_REQUEST',
  ACCOUNT_DELETE: 'ACCOUNT_DELETE',
  RBAC_DENIED: 'RBAC_DENIED',
  CONSENT_CREATE: 'CONSENT_CREATE',
  VOICE_UPLOAD: 'VOICE_UPLOAD',
  VOICE_REPORT_FINALIZE: 'VOICE_REPORT_FINALIZE',
  VOICE_PDF_DOWNLOAD: 'VOICE_PDF_DOWNLOAD',
} as const;
export type AuditAction = typeof AuditAction[keyof typeof AuditAction];