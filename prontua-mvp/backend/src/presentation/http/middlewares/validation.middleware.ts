import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from '@shared/errors/app-error';

type Source = 'body' | 'query' | 'params';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Sanitização e validação rigorosa de entrada com Zod.
 *
 * - Mitiga SQL Injection (Prisma já parametriza, mas validar tipos elimina
 *   a superfície completa) e Stored XSS (rejeita conteúdo malformado).
 * - Substitui req.body/query/params pelo objeto JÁ TIPADO E SANITIZADO
 *   retornado pelo Zod, eliminando o risco de o use-case usar uma
 *   propriedade não validada.
 * - .strict() nos schemas rejeita campos extras (defesa contra mass
 *   assignment).
 */
export function validate(schemas: ValidateOptions): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      for (const source of ['body', 'query', 'params'] as Source[]) {
        const schema = schemas[source];
        if (!schema) continue;
        const parsed = schema.parse(req[source]);
        (req as any)[source] = parsed;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new AppError('VALIDATION_ERROR', 'Entrada inválida', 400, {
            details: err.flatten().fieldErrors,
          }),
        );
      }
      next(err);
    }
  };
}
