import type { TenantPrisma } from '@config/prisma';
import { NotFoundError } from '@shared/errors/app-error';

export async function getSessionUseCase(db: TenantPrisma, sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      patient:      { select: { id: true, fullName: true, whatsapp: true } },
      professional: { select: { id: true, name: true } },
      note:         true,
      payment:      true,
    },
  });
  if (!session) throw new NotFoundError('Sessão');
  return session;
}
