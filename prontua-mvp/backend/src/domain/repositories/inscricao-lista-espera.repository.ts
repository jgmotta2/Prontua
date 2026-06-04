import type { InscricaoListaEspera } from '@domain/entities/inscricao-lista-espera.entity';
import type { OrigemListaEspera } from '@shared/constants/lista-espera';

export interface CriarInscricaoListaEsperaInput {
  email: string;
  origem: OrigemListaEspera;
  ipHash?: string | null;
}

export interface ListarInscricoesListaEsperaInput {
  pagina: number;
  porPagina: number;
}

export interface ListarInscricoesListaEsperaResultado {
  inscricoes: InscricaoListaEspera[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface InscricaoListaEsperaRepository {
  criar(input: CriarInscricaoListaEsperaInput): Promise<InscricaoListaEspera>;
  buscarPorEmail(email: string): Promise<InscricaoListaEspera | null>;
  listar(input: ListarInscricoesListaEsperaInput): Promise<ListarInscricoesListaEsperaResultado>;
}
