import { z } from 'zod';
import { OrigemListaEspera } from '@shared/constants/lista-espera';

const origensPermitidas = Object.values(OrigemListaEspera) as [string, ...string[]];

export const inscreverListaEsperaBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(255),
    origem: z.enum(origensPermitidas).default(OrigemListaEspera.LANDING_CTA),
  })
  .strict();

export const listarListaEsperaQuerySchema = z
  .object({
    pagina: z.coerce.number().int().positive().optional(),
    porPagina: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();
