import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type UpdatePaymentData } from '../api/finance.api';
import type { ApiClientError } from '@lib/api/client';

export const paymentsKey = (month?: string) => ['payments', month ?? 'all'] as const;
export const summaryKey  = (month?: string) => ['finance', 'summary', month ?? 'current'] as const;

export function usePayments(month?: string) {
  return useQuery({
    queryKey: paymentsKey(month),
    queryFn:  () => financeApi.payments({ month }),
    staleTime: 30_000,
  });
}

export function useFinanceSummary(month?: string) {
  return useQuery({
    queryKey: summaryKey(month),
    queryFn:  () => financeApi.summary(month),
    staleTime: 30_000,
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiClientError, { id: string; data: UpdatePaymentData }>({
    mutationFn: ({ id, data }) => financeApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
