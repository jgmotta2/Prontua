import type { RequestHandler } from 'express';

/**
 * Middleware de sanitização XSS para campos de texto.
 *
 * Remove tags HTML de qualquer string no req.body antes que o dado
 * chegue ao validador Zod ou ao use-case. Defesa em profundidade:
 *   1ª linha — este middleware (strip de tags)
 *   2ª linha — Zod com .strict() e .trim() (validação de tipo/formato)
 *   3ª linha — Prisma com queries parametrizadas (previne SQL injection)
 *
 * Não usa bibliotecas externas pesadas (jsdom/dompurify) pois os campos
 * aqui são sempre texto simples (nome, cidade, e-mail) — nunca rich text.
 * Para campos que aceitam Markdown ou HTML controlado, use sanitize-html.
 */
function stripTags(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/<[^>]*>/g, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(stripTags);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripTags(v)]),
    );
  }
  return value;
}

export function sanitizeBody(): RequestHandler {
  return (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = stripTags(req.body) as Record<string, unknown>;
    }
    next();
  };
}
