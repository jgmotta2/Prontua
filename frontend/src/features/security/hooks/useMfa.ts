import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mfaApi, type MfaMethod } from '../api/mfa.api';

export function useMfaSetup() {
  return useMutation({ mutationFn: (method: MfaMethod) => mfaApi.setup(method) });
}

export function useMfaEnable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { method: MfaMethod; code: string; secret?: string }) =>
      mfaApi.enable(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentPassword: string) => mfaApi.disable(currentPassword),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useMfaSendOtp() {
  return useMutation({ mutationFn: (tempToken: string) => mfaApi.sendOtp(tempToken) });
}

export function useMfaVerify() {
  return useMutation({
    mutationFn: ({ tempToken, code }: { tempToken: string; code: string }) =>
      mfaApi.verify(tempToken, code),
  });
}
