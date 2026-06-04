import type { InscricaoListaEsperaRepository } from '@domain/repositories/inscricao-lista-espera.repository';

const POR_PAGINA_PADRAO = 25;
const POR_PAGINA_MAXIMO = 100;

export interface ListarInscricoesListaEsperaInput {
  pagina?: number;
  porPagina?: number;
}

export interface InscricaoListaEsperaResumo {
  id: string;
  email: string;
  origem: string;
  criadoEm: string;
}

export interface ListarInscricoesListaEsperaOutput {
  inscricoes: InscricaoListaEsperaResumo[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export async function listarInscricoesListaEsperaUseCase(
  repository: InscricaoListaEsperaRepository,
  input: ListarInscricoesListaEsperaInput,
): Promise<ListarInscricoesListaEsperaOutput> {
  const pagina = Math.max(1, input.pagina ?? 1);
  const porPagina = Math.min(
    POR_PAGINA_MAXIMO,
    Math.max(1, input.porPagina ?? POR_PAGINA_PADRAO),
  );

  const resultado = await repository.listar({ pagina, porPagina });
  const totalPaginas = Math.max(1, Math.ceil(resultado.total / porPagina));

  return {
    inscricoes: resultado.inscricoes.map((inscricao) => ({
      id: inscricao.id,
      email: inscricao.email,
      origem: inscricao.origem,
      criadoEm: inscricao.criadoEm.toISOString(),
    })),
    total: resultado.total,
    pagina: resultado.pagina,
    porPagina: resultado.porPagina,
    totalPaginas,
  };
}
