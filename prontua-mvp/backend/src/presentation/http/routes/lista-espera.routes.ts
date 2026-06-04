import { Router } from 'express';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { requireAdministradorPlataforma } from '@presentation/http/middlewares/administrador-plataforma.middleware';
import { listaEsperaRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import {
  inscreverListaEsperaBodySchema,
  listarListaEsperaQuerySchema,
} from '@presentation/http/schemas/lista-espera.schema';
import { listaEsperaController } from '@presentation/http/controllers/lista-espera.controller';

const router = Router();

router.post(
  '/',
  listaEsperaRateLimiter,
  validate({ body: inscreverListaEsperaBodySchema }),
  listaEsperaController.inscrever,
);

router.get(
  '/',
  authRequired(),
  requireAdministradorPlataforma(),
  validate({ query: listarListaEsperaQuerySchema }),
  listaEsperaController.listar,
);

export { router as listaEsperaRoutes };
