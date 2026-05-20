import { api } from '@lib/api/client';

export interface NoteData {
  id: string;
  content: string | null;
  nextSteps: string | null;
  techniqueUsed: string | null;
  patientMood: number | null;
  updatedAt: string;
  authorId: string;
}

export interface TimelineEntry {
  sessionId: string;
  scheduledAt: string;
  durationMin: number;
  mode: 'PRESENCIAL' | 'ONLINE';
  status: string;
  value: number;
  professional: { id: string; name: string; specialty: string };
  note: NoteData | null;
}

export interface UpsertNoteData {
  content?: string;
  nextSteps?: string;
  techniqueUsed?: string;
  patientMood?: number;
}

export const notesApi = {
  timeline: (patientId: string) =>
    api.get<{ entries: TimelineEntry[]; patientName: string }>(`/notes/patient/${patientId}`),

  upsert: (sessionId: string, data: UpsertNoteData) =>
    api.put<{ id: string; updatedAt: string }>(`/notes/session/${sessionId}`, data),

  exportPdfUrl: (patientId: string) => `/api/notes/export/patient/${patientId}`,

  shareWhatsApp: (patientId: string) =>
    api.post<{ ok: boolean }>(`/notes/share/patient/${patientId}`),
};
