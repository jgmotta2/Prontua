import { prisma } from '@config/prisma';
import type { AuditAction } from '@shared/constants/enums';
import { logger } from '@shared/utils/logger';

interface AuditEntry {
  action: AuditAction;
  tenantId?: string | null;
  userId?: string | null;
  resourceType?: string;
  resourceId?: string;
  ipHash?: string | null;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const FORBIDDEN_METADATA_KEYS = new Set([
  // PII
  'name', 'fullName', 'email', 'phone', 'whatsapp', 'document', 'cpf', 'rg',
  'birthDate', 'address',
  // PHI
  'note', 'notes', 'diagnosis', 'medication', 'symptom', 'content',
  'observation',
]);

/**
 * Persiste evento de auditoria. Append-only — sem update/delete.
 *
 * Defesa: rejeita metadata com chaves óbvias de PII/PHI para forçar
 * disciplina no que vai para o log. Você não quer que um prontuário
 * vaze por um campo de "metadata" de auditoria.
 */
class AuditLogger {
  async log(entry: AuditEntry): Promise<void> {
    try {
      if (entry.metadata) {
        for (const key of Object.keys(entry.metadata)) {
          if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) {
            logger.warn(
              { key, action: entry.action },
              'audit_logger: chave proibida em metadata foi removida',
            );
            delete entry.metadata[key];
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          action: entry.action,
          tenantId: entry.tenantId ?? null,
          userId: entry.userId ?? null,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          ipHash: entry.ipHash ?? null,
          userAgent: entry.userAgent?.slice(0, 256),
          metadata: entry.metadata != null ? JSON.stringify(entry.metadata) : undefined,
        },
      });
    } catch (err) {
      // Audit log nunca pode quebrar a request. Apenas reporta.
      logger.error({ err, entry }, 'audit_logger_failed');
    }
  }
}

export const auditLogger = new AuditLogger();
