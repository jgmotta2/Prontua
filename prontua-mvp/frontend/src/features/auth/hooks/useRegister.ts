import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';
import type { RegisterFormValues } from '@lib/validation/auth.schema';
import { unmaskWhatsapp } from '@lib/utils/mask';

interface RegisterResponse {
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'PROFESSIONAL' | 'ASSISTANT';
}

/**
 * Hook que encapsula a chamada de cadastro.
 *
 * - Limpa a máscara do WhatsApp antes de enviar.
 * - O cookie de sessão é setado pelo backend (HttpOnly) — o hook
 *   não toca em nenhum token no cliente.
 * - Erros do backend chegam tipados como ApiClientError (code/message/details).
 */
export function useRegister() {
  return useMutation<RegisterResponse, ApiClientError, RegisterFormValues>({
    mutationFn: (values) =>
      api.post<RegisterResponse>('/auth/register', {
        ...values,
        whatsapp: unmaskWhatsapp(values.whatsapp),
      }),
  });
}
