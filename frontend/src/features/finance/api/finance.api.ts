import { api } from '@lib/api/client';

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED';
export type PaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'TRANSFER' | 'OTHER';

export interface PaymentEntry {
  id: string;
  patientId: string;
  sessionId: string | null;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod | null;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
  patient: { id: string; fullName: string };
  session: { id: string; scheduledAt: string; mode: string } | null;
}

export interface FinanceSummary {
  paidThisMonth: { amount: number; count: number };
  pending:       { amount: number; count: number };
  overdue:       { amount: number; count: number };
}

export interface UpdatePaymentData {
  status:  PaymentStatus;
  method?: PaymentMethod;
  paidAt?: string;
}

export const financeApi = {
  payments: (params?: { status?: string; month?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.month)  q.set('month',  params.month);
    const qs = q.toString();
    return api
      .get<{ payments: PaymentEntry[] }>(`/finance/payments${qs ? `?${qs}` : ''}`)
      .then((r) => r.payments);
  },

  summary: (month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return api.get<FinanceSummary>(`/finance/summary${qs}`);
  },

  update: (id: string, data: UpdatePaymentData) =>
    api.patch<PaymentEntry>(`/finance/payments/${id}`, data),
};
