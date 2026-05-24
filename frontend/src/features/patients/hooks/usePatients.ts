import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi, type PatientFormData } from '../api/patients.api';
import type { ApiClientError } from '@lib/api/client';

export const PATIENTS_KEY = ['patients'] as const;
export const patientKey = (id: string) => ['patients', id] as const;

export function usePatients() {
  return useQuery({
    queryKey: PATIENTS_KEY,
    queryFn: () => patientsApi.list(),
    staleTime: 30_000,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKey(id),
    queryFn: () => patientsApi.get(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiClientError, PatientFormData>({
    mutationFn: patientsApi.create,
    onSuccess:  () => qc.invalidateQueries({ queryKey: PATIENTS_KEY }),
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiClientError, Partial<PatientFormData>>({
    mutationFn: (data) => patientsApi.update(id, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: patientKey(id) });
      qc.invalidateQueries({ queryKey: PATIENTS_KEY });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiClientError, string>({
    mutationFn: patientsApi.delete,
    onSuccess:  () => qc.invalidateQueries({ queryKey: PATIENTS_KEY }),
  });
}
