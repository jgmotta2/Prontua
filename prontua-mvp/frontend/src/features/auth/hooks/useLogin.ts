import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';
import type { LoginFormValues } from '@lib/validation/auth.schema';

export type LoginResponse = { step: 'authenticated'; userId: string; tenantId: string };

export function useLogin() {
  return useMutation<LoginResponse, ApiClientError, LoginFormValues>({
    mutationFn: (values) => api.post<LoginResponse>('/auth/login', values),
  });
}

export function useLogout() {
  return useMutation<void, ApiClientError, void>({
    mutationFn: () => api.post<void>('/auth/logout'),
  });
}
