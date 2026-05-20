import type { TenantPrisma } from '@config/prisma';
import type { SessionStatus } from '@prisma/client';
import { NotFoundError } from '@shared/errors/app-error';

export async function updateSessionStatusUseCase(
  db: TenantPrisma,
  sessionId: string,
  status: SessionStatus,
) {
  const existing = await db.session.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!existing) throw new NotFoundError('Sessão');

  return db.session.update({ where: { id: sessionId }, data: { status } });
}
