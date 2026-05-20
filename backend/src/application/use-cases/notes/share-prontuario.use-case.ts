import type { TenantPrisma } from '@config/prisma';
import { NotFoundError, AppError } from '@shared/errors/app-error';
import { env } from '@config/env';
import { zApiService } from '@infrastructure/messaging/zapi.service';
import { exportPatientPdfUseCase } from './export-patient-pdf.use-case';

export async function shareProntuarioUseCase(
  db: TenantPrisma,
  patientId: string,
  tenantId: string,
): Promise<void> {
  if (!env.ZAPI_INSTANCE_ID || !env.ZAPI_TOKEN) {
    throw new AppError('ZAPI_NOT_CONFIGURED', 'Integração WhatsApp não configurada', 503);
  }

  const patient = await db.patient.findUnique({
    where:  { id: patientId },
    select: { whatsapp: true, fullName: true },
  });
  if (!patient) throw new NotFoundError('Paciente');

  const { pdfBuffer, safeName } = await exportPatientPdfUseCase(db, patientId, tenantId);

  const phone    = patient.whatsapp.replace(/\D/g, '');
  const fileName = `prontuario_${safeName.slice(0, 40)}.pdf`;

  await zApiService.sendClinicalDocument(
    tenantId,
    phone,
    patientId,
    pdfBuffer.toString('base64'),
    fileName,
  );
}
