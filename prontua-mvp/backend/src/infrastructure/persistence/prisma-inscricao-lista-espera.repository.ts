import { prisma } from '@config/prisma';
import type {
  CriarInscricaoListaEsperaInput,
  InscricaoListaEsperaRepository,
  ListarInscricoesListaEsperaInput,
  ListarInscricoesListaEsperaResultado,
} from '@domain/repositories/inscricao-lista-espera.repository';
import type { InscricaoListaEspera } from '@domain/entities/inscricao-lista-espera.entity';
import type { OrigemListaEspera } from '@shared/constants/lista-espera';

function paraEntidade(registro: {
  id: string;
  email: string;
  origem: string;
  ipHash: string | null;
  criadoEm: Date;
}): InscricaoListaEspera {
  return {
    id: registro.id,
    email: registro.email,
    origem: registro.origem as OrigemListaEspera,
    ipHash: registro.ipHash,
    criadoEm: registro.criadoEm,
  };
}

export class PrismaInscricaoListaEsperaRepository implements InscricaoListaEsperaRepository {
  async criar(input: CriarInscricaoListaEsperaInput): Promise<InscricaoListaEspera> {
    const registro = await prisma.inscricaoListaEspera.create({
      data: {
        email: input.email,
        origem: input.origem,
        ipHash: input.ipHash ?? null,
      },
    });
    return paraEntidade(registro);
  }

  async buscarPorEmail(email: string): Promise<InscricaoListaEspera | null> {
    const registro = await prisma.inscricaoListaEspera.findUnique({ where: { email } });
    return registro ? paraEntidade(registro) : null;
  }

  async listar(input: ListarInscricoesListaEsperaInput): Promise<ListarInscricoesListaEsperaResultado> {
    const skip = (input.pagina - 1) * input.porPagina;
    const [registros, total] = await Promise.all([
      prisma.inscricaoListaEspera.findMany({
        orderBy: { criadoEm: 'desc' },
        skip,
        take: input.porPagina,
      }),
      prisma.inscricaoListaEspera.count(),
    ]);

    return {
      inscricoes: registros.map(paraEntidade),
      total,
      pagina: input.pagina,
      porPagina: input.porPagina,
    };
  }
}

export const inscricaoListaEsperaRepository = new PrismaInscricaoListaEsperaRepository();
