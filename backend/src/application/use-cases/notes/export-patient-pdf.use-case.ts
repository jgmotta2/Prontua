import type { TenantPrisma } from '@config/prisma';
import { prisma } from '@config/prisma';
import { NotFoundError } from '@shared/errors/app-error';
import { generateClinicalPdf } from '@infrastructure/pdf/clinical.pdf';
import type { NoteEntry } from '@infrastructure/pdf/clinical.pdf';
import { decryptNoteFields } from './_decrypt-note.helper';

export async function exportPatientPdfUseCase(
  db: TenantPrisma,
  patientId: string,
  tenantId: string,
): Promise<{ pdfBuffer: Buffer; safeName: string }> {
  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Paciente');

  const sessions = await db.session.findMany({
    where:   { patientId },
    orderBy: { scheduledAt: 'desc' },
    include: {
      note:         true,
      professional: { select: { name: true } },
    },
  });

  const noteEntries: NoteEntry[] = sessions.map((s, idx) => {
    const decrypted = s.note ? decryptNoteFields(s.note as any) : { content: null, nextSteps: null };
    return {
      sessionDate:      s.scheduledAt,
      sessionIndex:     idx + 1,
      totalSessions:    sessions.length,
      durationMin:      s.durationMin,
      mode:             s.mode,
      status:           s.status,
      professionalName: s.professional.name,
      techniqueUsed:    (s.note as any)?.techniqueUsed ?? null,
      patientMood:      (s.note as any)?.patientMood   ?? null,
      content:          decrypted.content,
      nextSteps:        decrypted.nextSteps,
    };
  });

  // Tenant is not scoped — must use global prisma
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

  const pdfBuffer = await generateClinicalPdf({
    clinicName:       tenant?.name ?? 'Clínica',
    patientName:      patient.fullName,
    patientBirthDate: (patient as any).birthDate ?? null,
    notes:            noteEntries,
    generatedAt:      new Date(),
  });

  const safeName = patient.fullName
    .replace(/[^a-zA-ZÀ-ú0-9 ]/g, '')
    .replace(/\s+/g, '_');

  return { pdfBuffer, safeName };
}
