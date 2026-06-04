import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inscreverListaEsperaUseCase } from './inscrever-lista-espera.use-case';
import type { InscricaoListaEsperaRepository } from '@domain/repositories/inscricao-lista-espera.repository';
import { OrigemListaEspera } from '@shared/constants/lista-espera';

function criarRepositorioMock(): InscricaoListaEsperaRepository {
  return {
    criar: vi.fn(),
    buscarPorEmail: vi.fn(),
    listar: vi.fn(),
  };
}

describe('inscreverListaEsperaUseCase', () => {
  let repository: InscricaoListaEsperaRepository;

  beforeEach(() => {
    repository = criarRepositorioMock();
  });

  it('cria inscrição quando o e-mail ainda não existe', async () => {
    vi.mocked(repository.buscarPorEmail).mockResolvedValue(null);
    vi.mocked(repository.criar).mockResolvedValue({
      id: 'uuid-1',
      email: 'novo@exemplo.com',
      origem: OrigemListaEspera.LANDING_CTA,
      ipHash: 'hash-ip',
      criadoEm: new Date('2026-06-01T12:00:00.000Z'),
    });

    const resultado = await inscreverListaEsperaUseCase(repository, {
      email: '  Novo@Exemplo.COM ',
      origem: OrigemListaEspera.LANDING_CTA,
      ipHash: 'hash-ip',
    });

    expect(repository.buscarPorEmail).toHaveBeenCalledWith('novo@exemplo.com');
    expect(repository.criar).toHaveBeenCalledWith({
      email: 'novo@exemplo.com',
      origem: OrigemListaEspera.LANDING_CTA,
      ipHash: 'hash-ip',
    });
    expect(resultado.jaInscrito).toBe(false);
    expect(resultado.email).toBe('novo@exemplo.com');
  });

  it('retorna idempotente quando o e-mail já está inscrito', async () => {
    vi.mocked(repository.buscarPorEmail).mockResolvedValue({
      id: 'uuid-existente',
      email: 'existente@exemplo.com',
      origem: OrigemListaEspera.LANDING_CTA,
      ipHash: null,
      criadoEm: new Date('2026-05-01T10:00:00.000Z'),
    });

    const resultado = await inscreverListaEsperaUseCase(repository, {
      email: 'existente@exemplo.com',
      origem: OrigemListaEspera.LANDING_CTA,
    });

    expect(repository.criar).not.toHaveBeenCalled();
    expect(resultado.jaInscrito).toBe(true);
    expect(resultado.id).toBe('uuid-existente');
  });
});
