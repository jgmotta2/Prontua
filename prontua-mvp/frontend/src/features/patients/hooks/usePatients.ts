import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';

export interface Patient {
  id: string;
  fullName: string;
  email?: string;
  whatsapp: string;
  sessionValue: number;
  frequencyTag?: string;
  tags: string[];
  createdAt: string;
}

export interface PatientDetail extends Patient {
  birthDate?: string;
  notesGeneral?: string;
}

export interface CreatePatientInput {
  fullName: string;
  email?: string;
  whatsapp: string;
  sessionValue: number;
  frequencyTag?: string;
  document?: string;
  tags?: string[];
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {}

const QUERY_KEY = 'patients';

export function usePatients() {
  return useQuery<{ patients: Patient[] }, ApiClientError>({
    queryKey: [QUERY_KEY],
    queryFn: () => api.get('/patients'),
  });
}

export function usePatient(id: string) {
  return useQuery<PatientDetail, ApiClientError>({
    queryKey: [QUERY_KEY, id],
    queryFn: () => api.get(`/patients/${id}`),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation<PatientDetail, ApiClientError, CreatePatientInput>({
    mutationFn: (body) => api.post('/patients', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation<PatientDetail, ApiClientError, UpdatePatientInput>({
    mutationFn: (body) => api.patch(`/patients/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
