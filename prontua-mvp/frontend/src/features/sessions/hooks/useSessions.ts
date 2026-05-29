import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';

export interface SessionItem {
  id: string;
  scheduledAt: string;
  durationMin: number;
  mode: 'PRESENCIAL' | 'ONLINE';
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
  value: number;
  patientId: string;
  patientName: string;
  paymentStatus: 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED' | null;
}

export interface CreateSessionInput {
  patientId: string;
  scheduledAt: string;
  durationMin?: number;
  mode?: 'PRESENCIAL' | 'ONLINE';
  value: number;
}

const QUERY_KEY = 'sessions';

export function useSessions(from: Date, to: Date) {
  return useQuery<{ sessions: SessionItem[] }, ApiClientError>({
    queryKey: [QUERY_KEY, from.toISOString(), to.toISOString()],
    queryFn: () =>
      api.get('/sessions', { query: { from: from.toISOString(), to: to.toISOString() } }),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation<{ sessionId: string; paymentId: string }, ApiClientError, CreateSessionInput>({
    mutationFn: (body) => api.post('/sessions', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; status: string },
    ApiClientError,
    { id: string; status: SessionItem['status'] }
  >({
    mutationFn: ({ id, status }) => api.patch(`/sessions/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
