import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';
import { OrigemListaEspera } from '@lib/constants/lista-espera';

export interface InscreverListaEsperaResponse {
  id: string;
  email: string;
  criadoEm: string;
  jaInscrito: boolean;
}

export function useInscreverListaEspera() {
  return useMutation<InscreverListaEsperaResponse, ApiClientError, { email: string }>({
    mutationFn: (valores) =>
      api.post<InscreverListaEsperaResponse>('/lista-espera', {
        email: valores.email,
        origem: OrigemListaEspera.LANDING_CTA,
      }),
  });
}
