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

export function usePayments(status?: 'PENDING' | 'PAID') {
  return useQuery<{ payments: PaymentItem[] }, ApiClientError>({
    queryKey: [QUERY_KEY, status],
    queryFn: () => api.get('/finance/payments', { query: status ? { status } : undefined }),
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
