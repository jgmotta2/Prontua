import { useQuery } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';

interface SessionInfo {
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'PROFESSIONAL' | 'ASSISTANT';
  mfaEnabled: boolean;
  mfaMethod: 'APP' | 'WHATSAPP' | null;
}

/**
 * Resolve a sessão atual chamando /auth/me. Se o cookie for inválido
 * ou ausente, o backend retorna 401 e o hook expõe `isError`.
 * Usar para gatekeeping de rotas privadas.
 */
export function useSession() {
  return useQuery<SessionInfo, ApiClientError>({
    queryKey: ['session'],
    queryFn: () => api.get<SessionInfo>('/auth/me'),
    retry: false,
    staleTime: 60 * 1000,
  });
}
