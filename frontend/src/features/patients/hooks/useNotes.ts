import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../api/notes.api';
import type { UpsertNoteData } from '../api/notes.api';

export const timelineKey = (patientId: string) => ['clinical-timeline', patientId];

export function useClinicalTimeline(patientId: string) {
  return useQuery({
    queryKey: timelineKey(patientId),
    queryFn:  () => notesApi.timeline(patientId),
    enabled:  !!patientId,
    staleTime: 30_000,
  });
}

export function useUpsertNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: UpsertNoteData }) =>
      notesApi.upsert(sessionId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: timelineKey(patientId) });
    },
  });
}
