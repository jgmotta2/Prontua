import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';

export function useSendVerification() {
  return useMutation<void, ApiClientError, void>({
    mutationFn: () => api.post('/auth/send-verification'),
  });
}

export function useConfirmVerification() {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, { code: string }>({
    mutationFn: (body) => api.post('/auth/verify-email', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session'] }),
  });
}
