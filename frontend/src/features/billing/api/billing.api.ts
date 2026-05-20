import { api } from '@lib/api/client';

export interface BillingStatus {
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  trialEndsAt: string;
  trialDaysLeft: number;
  inTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
}

export const billingApi = {
  getStatus: () => api.get<BillingStatus>('/billing/status'),

  createCheckout: () => api.post<{ url: string }>('/billing/checkout'),

  createPortal: () => api.post<{ url: string }>('/billing/portal'),
};
