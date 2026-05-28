import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '@shared/errors/app-error';
import { logger } from '@shared/utils/logger';

/**
 * Error handler centralizado.
 *
 * - AppError: erro de domínio/aplicação, respondido com seu statusCode
 *   e código semântico. Mensagem é segura para o cliente.
 * - Qualquer outro erro: 500 com mensagem genérica. NUNCA expõe stack
 *   trace, nome de tabela, query SQL ou path do filesystem em produção.
 * - Toda exceção é logada com requestId, userId (se houver) e action.
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const requestId = (req as any).id;
  const userId = req.auth?.sub;
  const tenantId = req.auth?.tenantId;

  if (err instanceof AppError) {
    logger.warn({ requestId, userId, tenantId, code: err.code, message: err.message }, 'app_error');
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.context ?? {}),
      },
      requestId,
    });
    return;
  }

  logger.error(
    { requestId, userId, tenantId, err: err instanceof Error ? err.stack : err },
    'unhandled_error',
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor. Nossa equipe foi notificada.',
    },
    requestId,
  });
};
