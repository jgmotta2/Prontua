import type { InscricaoListaEsperaRepository } from '@domain/repositories/inscricao-lista-espera.repository';
import type { OrigemListaEspera } from '@shared/constants/lista-espera';

export interface InscreverListaEsperaInput {
  email: string;
  origem: OrigemListaEspera;
  ipHash?: string | null;
}

export interface InscreverListaEsperaOutput {
  id: string;
  email: string;
  criadoEm: string;
  jaInscrito: boolean;
}

export async function inscreverListaEsperaUseCase(
  repository: InscricaoListaEsperaRepository,
  input: InscreverListaEsperaInput,
): Promise<InscreverListaEsperaOutput> {
  const emailNormalizado = input.email.trim().toLowerCase();

  const existente = await repository.buscarPorEmail(emailNormalizado);
  if (existente) {
    return {
      id: existente.id,
      email: existente.email,
      criadoEm: existente.criadoEm.toISOString(),
      jaInscrito: true,
    };
  }

  const inscricao = await repository.criar({
    email: emailNormalizado,
    origem: input.origem,
    ipHash: input.ipHash,
  });

  return {
    id: inscricao.id,
    email: inscricao.email,
    criadoEm: inscricao.criadoEm.toISOString(),
    jaInscrito: false,
  };
}
