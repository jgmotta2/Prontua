import type { TenantPrisma } from '@config/prisma';
import { NotFoundError } from '@shared/errors/app-error';
import { decryptNoteFields } from './_decrypt-note.helper';

export async function getPatientTimelineUseCase(db: TenantPrisma, patientId: string) {
  const patient = await db.patient.findUnique({ where: { id: patientId }, select: { fullName: true } });
  if (!patient) throw new NotFoundError('Paciente');

  const sessions = await db.session.findMany({
    where:   { patientId },
    orderBy: { scheduledAt: 'desc' },
    include: {
      note:         true,
      professional: { select: { id: true, name: true, specialty: true } },
    },
  });

  const entries = sessions.map((s) => {
    const decrypted = s.note ? decryptNoteFields(s.note as any) : { content: null, nextSteps: null };
    return {
      sessionId:    s.id,
      scheduledAt:  s.scheduledAt,
      durationMin:  s.durationMin,
      mode:         s.mode,
      status:       s.status,
      value:        Number(s.value),
      professional: s.professional,
      note: s.note
        ? {
            id:            s.note.id,
            content:       decrypted.content,
            nextSteps:     decrypted.nextSteps,
            techniqueUsed: (s.note as any).techniqueUsed ?? null,
            patientMood:   (s.note as any).patientMood   ?? null,
            updatedAt:     s.note.updatedAt,
            authorId:      s.note.authorId,
          }
        : null,
    };
  });

  return { entries, patientName: patient.fullName };
}
