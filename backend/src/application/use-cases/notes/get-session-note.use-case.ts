import type { TenantPrisma } from '@config/prisma';
import { decryptNoteFields } from './_decrypt-note.helper';

export async function getSessionNoteUseCase(db: TenantPrisma, sessionId: string) {
  const note = await db.sessionNote.findUnique({ where: { sessionId } });

  if (!note) {
    return { content: null, nextSteps: null, techniqueUsed: null, patientMood: null };
  }

  const { content, nextSteps } = decryptNoteFields(note as any);

  return {
    content,
    nextSteps,
    techniqueUsed: (note as any).techniqueUsed ?? null,
    patientMood:   (note as any).patientMood   ?? null,
    updatedAt:     note.updatedAt,
  };
}
