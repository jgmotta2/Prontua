import { useQuery } from '@tanstack/react-query';
import { api, ApiClientError } from '@lib/api/client';

export interface InscricaoListaEsperaItem {
  id: string;
  email: string;
  origem: string;
  criadoEm: string;
}

export interface ListaEsperaEmailsResponse {
  inscricoes: InscricaoListaEsperaItem[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

const QUERY_KEY = 'lista-espera-admin';

export function useListaEsperaEmails(pagina: number) {
  return useQuery<ListaEsperaEmailsResponse, ApiClientError>({
    queryKey: [QUERY_KEY, pagina],
    queryFn: () =>
      api.get<ListaEsperaEmailsResponse>('/lista-espera', {
        query: { pagina },
      }),
    staleTime: 30 * 1000,
  });
}
