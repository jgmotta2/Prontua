import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listarInscricoesListaEsperaUseCase } from './listar-inscricoes-lista-espera.use-case';
import type { InscricaoListaEsperaRepository } from '@domain/repositories/inscricao-lista-espera.repository';
import { OrigemListaEspera } from '@shared/constants/lista-espera';

describe('listarInscricoesListaEsperaUseCase', () => {
  let repository: InscricaoListaEsperaRepository;

  beforeEach(() => {
    repository = {
      criar: vi.fn(),
      buscarPorEmail: vi.fn(),
      listar: vi.fn(),
    };
  });

  it('normaliza paginação e calcula total de páginas', async () => {
    vi.mocked(repository.listar).mockResolvedValue({
      inscricoes: [
        {
          id: '1',
          email: 'a@exemplo.com',
          origem: OrigemListaEspera.LANDING_CTA,
          ipHash: null,
          criadoEm: new Date('2026-06-01T12:00:00.000Z'),
        },
      ],
      total: 30,
      pagina: 1,
      porPagina: 25,
    });

    const resultado = await listarInscricoesListaEsperaUseCase(repository, {
      pagina: 0,
      porPagina: 200,
    });

    expect(repository.listar).toHaveBeenCalledWith({ pagina: 1, porPagina: 100 });
    expect(resultado.totalPaginas).toBe(1);
    expect(resultado.inscricoes).toHaveLength(1);
    expect(resultado.inscricoes[0]?.criadoEm).toBe('2026-06-01T12:00:00.000Z');
  });
});
