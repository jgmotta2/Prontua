import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientError } from '@lib/api/client';
import type { ReactNode } from 'react';

/**
 * QueryClient com defaults conservadores:
 *  - retry desativado para erros 4xx (não adianta tentar de novo)
 *  - staleTime curto para que dados clínicos sejam sempre frescos
 *  - refetchOnWindowFocus desligado para evitar barulho em telas longas
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
