import type { TenantPrisma } from '@config/prisma';
import type { PaymentStatus, PaymentMethod } from '@prisma/client';
import { NotFoundError } from '@shared/errors/app-error';

export interface UpdatePaymentInput {
  status: PaymentStatus;
  method?: PaymentMethod;
  paidAt?: Date;
  dueDate?: Date;
}

export async function updatePaymentUseCase(
  db: TenantPrisma,
  paymentId: string,
  input: UpdatePaymentInput,
) {
  const existing = await db.payment.findUnique({ where: { id: paymentId }, select: { id: true } });
  if (!existing) throw new NotFoundError('Pagamento');

  // Auto-set paidAt when marking PAID without explicit timestamp
  const paidAt = input.status === 'PAID' && !input.paidAt ? new Date() : input.paidAt;

  return db.payment.update({
    where: { id: paymentId },
    data:  { status: input.status, method: input.method, paidAt, dueDate: input.dueDate } as any,
  });
}
