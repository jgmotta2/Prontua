import { encryptionService } from '@infrastructure/crypto/encryption.service';
import type { EncryptedPayload } from '@infrastructure/crypto/encryption.service';

interface NoteRow {
  contentEnc: string;
  contentIv: string;
  contentTag: string;
  keyVersion: number;
  nextStepsEnc?: string | null;
  nextStepsIv?: string | null;
  nextStepsTag?: string | null;
}

export function decryptNoteFields(note: NoteRow): { content: string | null; nextSteps: string | null } {
  let content: string | null = null;
  let nextSteps: string | null = null;

  try {
    const raw = encryptionService.decrypt({
      ciphertext: note.contentEnc,
      iv:         note.contentIv,
      tag:        note.contentTag,
      keyVersion: note.keyVersion,
    } satisfies EncryptedPayload);
    content = raw === '' ? null : raw;
  } catch { /* corrupt blob — surface null */ }

  if (note.nextStepsEnc && note.nextStepsIv && note.nextStepsTag) {
    try {
      const raw = encryptionService.decrypt({
        ciphertext: note.nextStepsEnc,
        iv:         note.nextStepsIv,
        tag:        note.nextStepsTag,
        keyVersion: note.keyVersion,
      } satisfies EncryptedPayload);
      nextSteps = raw === '' ? null : raw;
    } catch { /* corrupt blob — surface null */ }
  }

  return { content, nextSteps };
}
