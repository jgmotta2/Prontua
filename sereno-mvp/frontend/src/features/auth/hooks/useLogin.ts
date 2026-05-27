import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';
import type { LoginFormValues } from '@lib/validation/auth.schema';

export type LoginResponse =
  | { step: 'mfa_required'; preAuthToken: string; userId: string }
  | { step: 'authenticated'; userId: string; tenantId: string };

export interface MfaVerifyInput {
  preAuthToken: string;
  code: string;
}

export function useLogin() {
  return useMutation<LoginResponse, ApiClientError, LoginFormValues>({
    mutationFn: (values) => api.post<LoginResponse>('/auth/login', values),
  });
}

export function useMfaVerify() {
  return useMutation<{ userId: string; tenantId: string }, ApiClientError, MfaVerifyInput>({
    mutationFn: (values) =>
      api.post<{ userId: string; tenantId: string }>('/auth/mfa/verify', values),
  });
}

export function useLogout() {
  return useMutation<void, ApiClientError, void>({
    mutationFn: () => api.post<void>('/auth/logout'),
  });
}
