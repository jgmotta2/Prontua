import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useListaEsperaEmails } from '../hooks/useListaEsperaEmails';
import { TabelaInscricoesListaEspera } from './TabelaInscricoesListaEspera';
import { ADMIN_LISTA_ESPERA } from '../constants/admin-content';

export function ListaEsperaEmailsPage() {
  const [pagina, setPagina] = useState(1);
  const { data, isLoading, isError } = useListaEsperaEmails(pagina);

  const totalPaginas = data?.totalPaginas ?? 1;
  const podeAnterior = pagina > 1;
  const podeProxima = pagina < totalPaginas;

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          {ADMIN_LISTA_ESPERA.tituloPagina}
        </h1>
        <p className="mt-2 text-sm text-muted">{ADMIN_LISTA_ESPERA.subtitulo}</p>
        {data ? (
          <p className="mt-3 text-sm font-medium text-sage-dark">
            {ADMIN_LISTA_ESPERA.totalInscricoes(data.total)}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        </div>
      ) : null}

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {ADMIN_LISTA_ESPERA.erroCarregar}
        </p>
      ) : null}

      {!isLoading && !isError && data?.inscricoes.length === 0 ? (
        <p className="rounded-xl border border-warm bg-white px-4 py-8 text-center text-sm text-muted">
          {ADMIN_LISTA_ESPERA.vazio}
        </p>
      ) : null}

      {!isLoading && !isError && data && data.inscricoes.length > 0 ? (
        <>
          <TabelaInscricoesListaEspera inscricoes={data.inscricoes} />
          <nav
            className="mt-6 flex flex-wrap items-center justify-between gap-3"
            aria-label="Paginação da lista de espera"
          >
            <p className="text-sm text-muted">
              {ADMIN_LISTA_ESPERA.paginaDe(data.pagina, data.totalPaginas)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!podeAnterior}
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                className="btn-secondary inline-flex items-center gap-1 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {ADMIN_LISTA_ESPERA.paginaAnterior}
              </button>
              <button
                type="button"
                disabled={!podeProxima}
                onClick={() => setPagina((atual) => atual + 1)}
                className="btn-secondary inline-flex items-center gap-1 text-sm disabled:opacity-50"
              >
                {ADMIN_LISTA_ESPERA.proximaPagina}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
