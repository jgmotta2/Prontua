import { useQuery } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';

export interface DashboardData {
  metrics: {
    sessionsToday: number;
    sessionsThisWeek: number;
    sessionsThisMonth: number;
    revenuePaidThisMonth: number;
    revenuePending: number;
  };
  revenueByMonth: Array<{ key: string; label: string; revenue: number }>;
  todayAgenda: Array<{
    id: string;
    scheduledAt: string;
    patientId: string;
    patientName: string;
    status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
    mode: 'PRESENCIAL' | 'ONLINE';
    durationMin: number;
    value: number;
  }>;
}

export function useDashboard() {
  return useQuery<DashboardData, ApiClientError>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api.get<DashboardData>('/dashboard/overview'),
    staleTime: 60 * 1000, // dashboard refletindo até 1 min de atraso é aceitável
  });
}
