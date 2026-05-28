import { createHmac } from 'node:crypto';
import { env } from '@config/env';

/**
 * Hash HMAC-SHA256 com pepper aplicacional.
 *
 * Usado para:
 *  - Hash de IP em audit logs (anonimização)
 *  - Hash de CPF para lookup determinístico sem armazenar plaintext
 *
 * Pepper vive em env (HASH_PEPPER) e NUNCA no banco. Mesmo um dump
 * completo do PostgreSQL não permite reconstruir os valores originais
 * via rainbow table — você precisa também do pepper.
 */
const pepper = env.HASH_PEPPER;

export function hmac(input: string): string {
  return createHmac('sha256', pepper).update(input).digest('hex');
}

export function hashIp(ip: string): string {
  return hmac(`ip:${ip}`);
}

export function hashDocument(cpf: string): string {
  // Normaliza: remove qualquer caractere não-numérico antes de hashear.
  const digits = cpf.replace(/\D/g, '');
  return hmac(`doc:${digits}`);
}
