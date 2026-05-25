import type { TenantPrisma } from '@config/prisma';
import { encryptionService } from '@infrastructure/crypto/encryption.service';
import { NotFoundError, AppError } from '@shared/errors/app-error';
import type { UpsertNoteInput } from '@presentation/http/schemas/clinical.schema';

export async function upsertSessionNoteUseCase(
  db: TenantPrisma,
  sessionId: string,
  input: UpsertNoteInput,
  authorId: string,
): Promise<{ id: string; updatedAt: Date }> {
  const session = await db.session.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) throw new NotFoundError('Sessão');

  if (!input.content && !input.nextSteps && !input.techniqueUsed && input.patientMood == null) {
    throw new AppError('EMPTY_NOTE', 'Nenhum campo fornecido', 400);
  }

  // Always encrypt content — required DB columns must never be null on create
  const contentEnc  = encryptionService.encrypt(input.content ?? '');
  const nextStepsEnc = input.nextSteps ? encryptionService.encrypt(input.nextSteps) : null;

  const createData: Record<string, unknown> = {
    sessionId,
    authorId,
    contentEnc: contentEnc.ciphertext,
    contentIv:  contentEnc.iv,
    contentTag: contentEnc.tag,
    keyVersion: contentEnc.keyVersion,
    techniqueUsed: input.techniqueUsed ?? null,
    patientMood:   input.patientMood   ?? null,
    ...(nextStepsEnc && {
      nextStepsEnc: nextStepsEnc.ciphertext,
      nextStepsIv:  nextStepsEnc.iv,
      nextStepsTag: nextStepsEnc.tag,
    }),
  };

  const updateData: Record<string, unknown> = {};
  if (input.content !== undefined) {
    updateData['contentEnc'] = contentEnc.ciphertext;
    updateData['contentIv']  = contentEnc.iv;
    updateData['contentTag'] = contentEnc.tag;
    updateData['keyVersion'] = contentEnc.keyVersion;
  }
  if (nextStepsEnc) {
    updateData['nextStepsEnc'] = nextStepsEnc.ciphertext;
    updateData['nextStepsIv']  = nextStepsEnc.iv;
    updateData['nextStepsTag'] = nextStepsEnc.tag;
  }
  if (input.techniqueUsed !== undefined) updateData['techniqueUsed'] = input.techniqueUsed;
  if (input.patientMood   !== undefined) updateData['patientMood']   = input.patientMood;

  const note = await db.sessionNote.upsert({
    where:  { sessionId },
    create: createData as any,
    update: updateData as any,
  });

  return { id: note.id, updatedAt: note.updatedAt };
}
