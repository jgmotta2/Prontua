import { api } from '@lib/api/client';

export interface PatientSummary {
  id: string;
  fullName: string;
  whatsapp: string;
  sessionValue: number;
  frequencyTag: string | null;
  tags: string[];
  createdAt: string;
}

export interface Patient extends PatientSummary {
  city: string | null;
  birthDate: string | null;
  email: string | null;
  notesGeneral: string | null;
  active: boolean;
  deletedAt: string | null;
}

export interface PatientFormData {
  fullName: string;
  city: string;
  chiefComplaint: string;
  birthDate?: string;
  email?: string;
  whatsapp: string;
  document?: string;
  notesGeneral?: string;
  tags?: string[];
  sessionValue: number;
  frequencyTag?: 'Semanal' | 'Quinzenal' | 'Mensal';
}

export const patientsApi = {
  list: () =>
    api.get<{ patients: PatientSummary[] }>('/patients').then((r) => r.patients),

  get: (id: string) =>
    api.get<Patient>(`/patients/${id}`),

  create: (data: PatientFormData) =>
    api.post<Patient>('/patients', data),

  update: (id: string, data: Partial<PatientFormData>) =>
    api.patch<Patient>(`/patients/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/patients/${id}`),
};
