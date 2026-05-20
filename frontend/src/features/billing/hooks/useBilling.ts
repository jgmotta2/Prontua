import { useQuery, useMutation } from '@tanstack/react-query';
import { billingApi } from '../api/billing.api';

export const BILLING_KEY = ['billing', 'status'] as const;

export function useBillingStatus() {
  return useQuery({
    queryKey: BILLING_KEY,
    queryFn:  billingApi.getStatus,
    staleTime: 60_000,
    retry: false,
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: billingApi.createCheckout,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function usePortal() {
  return useMutation({
    mutationFn: billingApi.createPortal,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
