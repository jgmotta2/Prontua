import { api } from '@lib/api/client';

export type SessionStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
export type SessionMode   = 'PRESENCIAL' | 'ONLINE';

export interface SessionEntry {
  id: string;
  scheduledAt: string;
  durationMin: number;
  mode: SessionMode;
  value: number;
  status: SessionStatus;
  patientId: string;
  professionalId: string;
  patient:      { fullName: string };
  professional: { name: string };
  payment: { id: string; status: string; amount: number; method: string | null } | null;
}

export interface CreateSessionData {
  patientId:    string;
  scheduledAt:  string;
  durationMin?: number;
  mode?:        SessionMode;
  value:        number;
}

export const agendaApi = {
  listByDate: (date: string) =>
    api
      .get<{ sessions: SessionEntry[] }>(`/sessions?date=${date}`)
      .then((r) => r.sessions),

  listByPatient: (patientId: string) =>
    api
      .get<{ sessions: SessionEntry[] }>(`/sessions?patientId=${patientId}`)
      .then((r) => r.sessions),

  create: (data: CreateSessionData) =>
    api.post<SessionEntry>('/sessions', data),

  updateStatus: (id: string, status: SessionStatus) =>
    api.patch<SessionEntry>(`/sessions/${id}/status`, { status }),
};
