import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Modelos com escopo de tenant — toda query nestes modelos DEVE
 * obrigatoriamente filtrar por tenantId. A extensão abaixo injeta
 * o filtro automaticamente, eliminando o risco de um desenvolvedor
 * esquecer e vazar dados entre clínicas.
 */
const TENANT_SCOPED_MODELS = new Set<Prisma.ModelName>([
  'Patient',
  'Session',
  'SessionNote',
  'Payment',
  'WhatsappLog',
  'PatientConsent',      // TCLE por paciente/clínica
  'VoiceSessionReport',  // Prontuários gerados por IA
  // AuditLog: leitura é tenant-scoped, escrita pode ser sem tenant (pre-auth)
]);

const READ_OPS = new Set([
  'findUnique', 'findUniqueOrThrow',
  'findFirst', 'findFirstOrThrow',
  'findMany', 'count', 'aggregate', 'groupBy',
]);

const UPDATE_OPS = new Set(['update', 'updateMany', 'upsert']);
const DELETE_OPS = new Set(['delete', 'deleteMany']);
const CREATE_OPS = new Set(['create', 'createMany']);

/**
 * Cliente Prisma compartilhado (singleton). Use diretamente apenas para:
 *  - Operações de Tenant (root)
 *  - Operações de User durante login (antes do contexto de tenant existir)
 *  - AuditLog em eventos pré-auth (login falho)
 *  - Migrations / seeds
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * Retorna um Prisma Client estendido com isolamento automático por tenant.
 *
 * USO OBRIGATÓRIO em qualquer use-case que toque dados de cliente:
 *   const db = forTenant(req.auth.tenantId);
 *   const patients = await db.patient.findMany();  // ← tenantId injetado
 *
 * Operações de leitura/update/delete: where.tenantId é forçado.
 * Operações de create: data.tenantId é forçado.
 *
 * Se um where já contém tenantId diferente, lança erro (defesa contra
 * cross-tenant takeover via injection).
 */
export function forTenant(tenantId: string) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('forTenant: tenantId obrigatório');
  }

  return prisma.$extends({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model as Prisma.ModelName)) {
            return query(args);
          }

          const a = args as { where?: Record<string, unknown>; data?: unknown };

          // READ / UPDATE / DELETE — força where.tenantId
          if (
            READ_OPS.has(operation) ||
            UPDATE_OPS.has(operation) ||
            DELETE_OPS.has(operation)
          ) {
            const where = (a.where ?? {}) as Record<string, unknown>;
            if (where.tenantId && where.tenantId !== tenantId) {
              throw new Error(
                `[tenant-isolation] tentativa de acessar tenantId diferente do contexto (model=${model})`,
              );
            }
            a.where = { ...where, tenantId };
          }

          // CREATE — força data.tenantId
          if (CREATE_OPS.has(operation)) {
            if (operation === 'createMany' && Array.isArray(a.data)) {
              a.data = (a.data as Record<string, unknown>[]).map((d) => ({
                ...d,
                tenantId,
              }));
            } else if (a.data && typeof a.data === 'object') {
              const d = a.data as Record<string, unknown>;
              if (d.tenantId && d.tenantId !== tenantId) {
                throw new Error(
                  `[tenant-isolation] tentativa de criar registro em tenantId diferente (model=${model})`,
                );
              }
              a.data = { ...d, tenantId };
            }
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof forTenant>;

// Graceful shutdown — garante que a conexão com o banco seja fechada
// corretamente em qualquer sinal de término do processo.
async function disconnect() {
  await prisma.$disconnect();
}

process.on('SIGTERM', disconnect);
process.on('SIGINT', disconnect);
process.on('beforeExit', disconnect);
