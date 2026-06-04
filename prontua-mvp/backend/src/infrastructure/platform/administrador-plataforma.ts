import { env } from '@config/env';

const emailsAllowlist = new Set(
  env.EMAILS_ADMIN_PLATAFORMA.map((email) => email.trim().toLowerCase()),
);

/**
 * Define se o usuário pode acessar rotas administrativas da plataforma
 * (lista de espera global). Combina flag no banco e allowlist em env.
 */
export function usuarioEhAdministradorPlataforma(
  email: string,
  flagNoBanco: boolean,
): boolean {
  if (flagNoBanco) return true;
  const emailNormalizado = email.trim().toLowerCase();
  return emailsAllowlist.has(emailNormalizado);
}
