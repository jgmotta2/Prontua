import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';
import type { LoginFormValues } from '@lib/validation/auth.schema';
import type { MfaMethod } from '@features/security/api/mfa.api';

export interface LoginSuccess {
  userId: string;
  tenantId: string;
}

export interface LoginMfaChallenge {
  requiresTwoFactor: true;
  mfaMethod: MfaMethod;
  tempToken: string;
}

export type LoginResponse = LoginSuccess | LoginMfaChallenge;

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
