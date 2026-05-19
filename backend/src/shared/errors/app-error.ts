/**
 * Erro de domínio/aplicação com semântica HTTP.
 *
 * Todo erro lançado por use-cases deve estender ou ser uma AppError.
 * O middleware de erro centralizado (error.middleware.ts) responde
 * com `code` + `message` seguros para o cliente. Use `context` para
 * detalhes adicionais que podem ser expostos (ex: campos inválidos).
 *
 * NUNCA inclua em `context`: PII, PHI, stack traces, queries SQL,
 * caminhos de filesystem.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super('NOT_FOUND', `${resource} não encontrado`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Credenciais inválidas') {
    super('UNAUTHENTICATED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permissão insuficiente') {
    super('FORBIDDEN', message, 403);
  }
}
