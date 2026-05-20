import { api } from '@lib/api/client';

export type Specialty =
  | 'PSICOLOGIA' | 'FISIOTERAPIA' | 'FONOAUDIOLOGIA'
  | 'PSICOPEDAGOGIA' | 'NUTRICAO' | 'TERAPIA_OCUPACIONAL' | 'OUTRA';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  city: string;
  state: string;
  specialty: Specialty;
  registry: string | null;
  role: string;
  mfaEnabled: boolean;
  tenantId: string;
  createdAt: string;
}

export interface UpdateProfileData {
  name?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  specialty?: Specialty;
  registry?: string | null;
}

export const settingsApi = {
  getProfile: () => api.get<UserProfile>('/users/me'),

  updateProfile: (data: UpdateProfileData) =>
    api.patch<UserProfile>('/users/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<void>('/users/me/change-password', { currentPassword, newPassword }),
};
