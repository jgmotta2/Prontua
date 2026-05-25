import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { settingsApi, type UpdateProfileData } from '../api/settings.api';
import type { ApiClientError } from '@lib/api/client';

export const PROFILE_KEY = ['user', 'profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn:  settingsApi.getProfile,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiClientError, UpdateProfileData>({
    mutationFn: settingsApi.updateProfile,
    onSuccess:  () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}

export function useChangePassword() {
  return useMutation<unknown, ApiClientError, { currentPassword: string; newPassword: string }>({
    mutationFn: ({ currentPassword, newPassword }) =>
      settingsApi.changePassword(currentPassword, newPassword),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation<void, ApiClientError, void>({
    mutationFn: () => settingsApi.logout(),
    onSettled: () => {
      // Clear all cached query data regardless of API success/failure
      qc.clear();
      navigate('/entrar', { replace: true });
    },
  });
}
