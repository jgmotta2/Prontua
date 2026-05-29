import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api/client';

export type Technique = 'TCC' | 'ACT' | 'EMDR' | 'DBT' | 'PSICANALISE' | 'GESTALT' | 'SISTEMICA' | 'OUTRA';

export interface SessionSummary {
  id: string;
  scheduledAt: string;
  durationMin: number;
  mode: string;
  value: number;
  status: string;
  hasNote: boolean;
  technique: Technique | null;
  humor: number | null;
}

export interface NoteDetail {
  sessionId: string;
  scheduledAt: string;
  durationMin: number;
  mode: string;
  value: number;
  status: string;
  patientId: string;
  technique: Technique | null;
  humor: number | null;
  evolutionNote: string;
  nextSteps: string;
}

export interface SaveNoteInput {
  technique: Technique | null;
  humor: number | null;
  evolutionNote: string;
  nextSteps: string;
}

export function usePatientSessions(patientId: string) {
  return useQuery<{ sessions: SessionSummary[] }>({
    queryKey: ['notes-sessions', patientId],
    queryFn: () => api.get(`/notes/patients/${patientId}`),
    enabled: !!patientId,
  });
}

export function useSessionNote(sessionId: string | null) {
  return useQuery<NoteDetail>({
    queryKey: ['note', sessionId],
    queryFn: () => api.get(`/notes/sessions/${sessionId}`),
    enabled: !!sessionId,
  });
}

export function useSaveNote(sessionId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, SaveNoteInput>({
    mutationFn: (body) => api.put(`/notes/sessions/${sessionId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['note', sessionId] });
      qc.invalidateQueries({ queryKey: ['notes-sessions'] });
    },
  });
}
