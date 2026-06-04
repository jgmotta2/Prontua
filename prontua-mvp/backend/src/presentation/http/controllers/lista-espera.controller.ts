import type { Request, Response, NextFunction } from 'express';
import { inscreverListaEsperaUseCase } from '@application/use-cases/lista-espera/inscrever-lista-espera.use-case';
import { listarInscricoesListaEsperaUseCase } from '@application/use-cases/lista-espera/listar-inscricoes-lista-espera.use-case';
import { inscricaoListaEsperaRepository } from '@infrastructure/persistence/prisma-inscricao-lista-espera.repository';
import type { OrigemListaEspera } from '@shared/constants/lista-espera';

export const listaEsperaController = {
  async inscrever(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const corpo = req.body as { email: string; origem: OrigemListaEspera };
      const resultado = await inscreverListaEsperaUseCase(inscricaoListaEsperaRepository, {
        email: corpo.email,
        origem: corpo.origem,
        ipHash: (req as { ipHash?: string }).ipHash ?? null,
      });
      res.status(201).json(resultado);
    } catch (erro) {
      next(erro);
    }
  },

  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const consulta = req.query as { pagina?: number; porPagina?: number };
      const resultado = await listarInscricoesListaEsperaUseCase(
        inscricaoListaEsperaRepository,
        consulta,
      );
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  },
};
