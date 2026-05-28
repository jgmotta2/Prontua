import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '@config/env';

/**
 * Criptografia em camada de aplicação (Application-Layer Encryption).
 *
 * Algoritmo: AES-256-GCM
 *  - AES com chave de 256 bits (32 bytes)
 *  - GCM (Galois/Counter Mode) fornece confidencialidade + autenticidade
 *    em uma única operação. A "auth tag" detecta qualquer adulteração
 *    no ciphertext.
 *  - IV aleatório de 96 bits (12 bytes) por operação — REQUISITO crítico
 *    do GCM: reuso de IV com a mesma chave quebra a segurança.
 *
 * Persistência:
 *  - ciphertext, IV e auth tag são armazenados em base64 em colunas
 *    separadas (SessionNote.contentEnc / contentIv / contentTag).
 *  - keyVersion é armazenado para suportar rotação de chave: leituras
 *    antigas usam a chave da versão correspondente.
 *
 * Em produção, a master key deve vir de um KMS (AWS KMS, GCP KMS) com
 * envelope encryption — a aplicação nunca toca na master key, apenas
 * em DEKs (Data Encryption Keys) de curto prazo.
 *
 * Modelo de ameaça coberto:
 *  - Vazamento de dump do PostgreSQL: prontuários permanecem ilegíveis.
 *  - Backup em mídia comprometida: idem.
 *  - SQL Injection que vaze colunas: idem.
 * NÃO coberto (precisa outras camadas):
 *  - Comprometimento do servidor de aplicação em runtime (chave em memória).
 *  - Compromisso do operador com acesso ao KMS.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // 96 bits — recomendado para GCM
const KEY_LENGTH = 32;      // 256 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64
  keyVersion: number;
}

export class EncryptionService {
  private readonly keysByVersion: Map<number, Buffer>;
  private readonly currentVersion: number;

  constructor() {
    const key = Buffer.from(env.ENCRYPTION_MASTER_KEY, 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new Error(`ENCRYPTION_MASTER_KEY deve ter exatamente ${KEY_LENGTH} bytes`);
    }
    this.currentVersion = env.ENCRYPTION_KEY_VERSION;
    this.keysByVersion = new Map([[this.currentVersion, key]]);

    // Carregue versões antigas aqui durante rotação de chave:
    //   const prevKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY_V1!, 'base64');
    //   this.keysByVersion.set(1, prevKey);
  }

  /**
   * Encripta um texto claro. Retorna ciphertext + IV + auth tag, todos
   * em base64, prontos para persistir em colunas separadas.
   */
  encrypt(plaintext: string): EncryptedPayload {
    if (typeof plaintext !== 'string') {
      throw new Error('encrypt: plaintext deve ser string');
    }

    const key = this.keysByVersion.get(this.currentVersion);
    if (!key) throw new Error('Chave da versão corrente não disponível');

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: enc.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      keyVersion: this.currentVersion,
    };
  }

  /**
   * Decripta um payload encriptado. Verifica a auth tag — qualquer
   * adulteração no ciphertext faz `final()` lançar.
   */
  decrypt(payload: EncryptedPayload): string {
    const key = this.keysByVersion.get(payload.keyVersion);
    if (!key) {
      throw new Error(`Chave da versão ${payload.keyVersion} não disponível`);
    }

    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    if (iv.length !== IV_LENGTH) throw new Error('IV inválido');
    if (tag.length !== AUTH_TAG_LENGTH) throw new Error('Auth tag inválida');

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);

    try {
      const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return dec.toString('utf8');
    } catch {
      // Não vaze detalhes do erro de cripto — pode ser oracle attack.
      throw new Error('Falha ao decifrar conteúdo (integridade comprometida ou chave incorreta)');
    }
  }

  /** Reencripta um payload na versão corrente — usado em job de rotação. */
  rotate(payload: EncryptedPayload): EncryptedPayload {
    if (payload.keyVersion === this.currentVersion) return payload;
    const plaintext = this.decrypt(payload);
    return this.encrypt(plaintext);
  }
}

export const encryptionService = new EncryptionService();
