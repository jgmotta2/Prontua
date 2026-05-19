import argon2 from 'argon2';
import { env } from '@config/env';

/**
 * Hashing de senha com Argon2id (vencedor do Password Hashing Competition,
 * recomendado pelo OWASP). Resistente a:
 *  - Força bruta com GPU/ASIC (memory-hard)
 *  - Side-channel attacks (variante 'id')
 *
 * Parâmetros ajustados via env para permitir aumento progressivo conforme
 * hardware do servidor evolui. OWASP 2024 recomenda mínimo:
 *   memoryCost: 19 MB (19_456 KiB), timeCost: 2, parallelism: 1
 * Aqui usamos 64 MB / 3 / 1 como ponto de partida confortável.
 */
class PasswordService {
  private readonly options = {
    type: argon2.argon2id as const,
    memoryCost: env.ARGON_MEMORY_COST,
    timeCost: env.ARGON_TIME_COST,
    parallelism: env.ARGON_PARALLELISM,
    // Argon2 gera salt aleatório de 16 bytes por padrão (RFC 9106 ok).
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  /**
   * Verifica senha em tempo constante (proteção contra timing attack).
   * Retorna `{ valid, needsRehash }`. Se `needsRehash`, atualize o hash
   * com os parâmetros atuais (útil quando você aumenta memoryCost).
   */
  async verify(hash: string, plain: string): Promise<{ valid: boolean; needsRehash: boolean }> {
    try {
      const valid = await argon2.verify(hash, plain);
      const needsRehash = valid && argon2.needsRehash(hash, this.options);
      return { valid, needsRehash };
    } catch {
      // Hash malformado — trata como inválido sem expor detalhe.
      return { valid: false, needsRehash: false };
    }
  }
}

export const passwordService = new PasswordService();
