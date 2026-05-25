import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api/client';

export interface ConsentStatus {
  hasActiveConsent: boolean;
  termVersion: string | null;
  agreedAt: string | null;
  isCurrentVersion: boolean;
}

export interface ConsentRecord {
  consentId: string;
  termVersion: string;
  agreedAt: string;
}

export function useConsent(patientId: string | null) {
  return useQuery<ConsentStatus>({
    queryKey: ['consent', patientId],
    queryFn: () => api.get<ConsentStatus>(`/consent/patients/${patientId}`),
    enabled: !!patientId,
    staleTime: 30_000,       // considera fresco por 30s
    retry: false,
  });
}

export function useRecordConsent(patientId: string) {
  const qc = useQueryClient();

  return useMutation<ConsentRecord, Error>({
    mutationFn: () => api.post<ConsentRecord>(`/consent/patients/${patientId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consent', patientId] });
    },
  });
}
