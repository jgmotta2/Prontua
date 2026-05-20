import type { TenantPrisma } from '@config/prisma';
import { NotFoundError } from '@shared/errors/app-error';
import { zApiService } from '@infrastructure/messaging/zapi.service';

export async function notifyPaymentDueUseCase(
  db: TenantPrisma,
  paymentId: string,
  tenantId: string,
): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      patient: { select: { fullName: true, whatsapp: true, id: true } },
    },
  });
  if (!payment) throw new NotFoundError('Pagamento');

  const firstName = payment.patient.fullName.split(' ')[0]!;
  const amount    = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(payment.amount));

  await zApiService.sendPaymentDue(tenantId, payment.patient.whatsapp, payment.patient.id, {
    firstName,
    amount,
  });
}
