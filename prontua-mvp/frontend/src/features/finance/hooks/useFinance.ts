import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';

export interface PaymentItem {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED';
  method: string | null;
  paidAt: string | null;
  dueDate: string | null;
  patientId: string;
  patientName: string;
  sessionId: string | null;
  sessionScheduledAt: string | null;
  createdAt: string;
}

const QUERY_KEY = 'payments';

export interface PaymentsFilter {
  status?: 'PENDING' | 'PAID';
  from?: string;
  to?: string;
}

export function usePayments(filter?: PaymentsFilter) {
  return useQuery<{ payments: PaymentItem[] }, ApiClientError>({
    queryKey: [QUERY_KEY, filter],
    queryFn: () => {
      const query: Record<string, string> = {};
      if (filter?.status) query['status'] = filter.status;
      if (filter?.from) query['from'] = filter.from;
      if (filter?.to) query['to'] = filter.to;
      return api.get('/finance/payments', { query: Object.keys(query).length ? query : undefined });
    },
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; status: string; paidAt: string; method: string | null },
    ApiClientError,
    { id: string; method?: string }
  >({
    mutationFn: ({ id, method }) => api.patch(`/finance/payments/${id}/pay`, method ? { method } : {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
