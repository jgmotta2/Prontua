import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agendaApi, type CreateSessionData, type SessionStatus } from '../api/agenda.api';
import type { ApiClientError } from '@lib/api/client';

export const agendaKey = (date: string) => ['agenda', date] as const;

export function useAgenda(date: string) {
  return useQuery({
    queryKey: agendaKey(date),
    queryFn:  () => agendaApi.listByDate(date),
    staleTime: 30_000,
    enabled:  !!date,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiClientError, CreateSessionData>({
    mutationFn: agendaApi.create,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiClientError, { id: string; status: SessionStatus }>({
    mutationFn: ({ id, status }) => agendaApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
