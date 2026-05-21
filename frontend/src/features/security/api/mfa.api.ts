import { api } from '@lib/api/client';

export type MfaMethod = 'APP' | 'WHATSAPP';

export interface MfaSetupAppResult {
  method: 'APP';
  secret: string;
  qrCodeDataUrl: string;
}

export interface MfaSetupWhatsappResult {
  method: 'WHATSAPP';
  whatsapp: string;
}

export type MfaSetupResult = MfaSetupAppResult | MfaSetupWhatsappResult;

export const mfaApi = {
  setup: (method: MfaMethod) =>
    api.post<MfaSetupResult>('/auth/2fa/setup', { method }),

  enable: (body: { method: MfaMethod; code: string; secret?: string }) =>
    api.post<{ ok: boolean }>('/auth/2fa/enable', body),

  disable: (currentPassword: string) =>
    api.post<{ ok: boolean }>('/auth/2fa/disable', { currentPassword }),

  sendOtp: (tempToken: string) =>
    api.post<{ sent: boolean }>('/auth/2fa/send-otp', { tempToken }),

  verify: (tempToken: string, code: string) =>
    api.post<{ userId: string; tenantId: string }>('/auth/2fa/verify', { tempToken, code }),
};
