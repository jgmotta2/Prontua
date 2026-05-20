import type { RequestHandler } from 'express';
import { prisma } from '@config/prisma';
import { PaymentRequiredError } from '@shared/errors/app-error';

/**
 * Verifica se o tenant tem trial ativo ou assinatura paga.
 * Deve rodar APÓS authRequired() — depende de req.auth.tenantId.
 * Retorna 402 se nem um nem outro.
 */
export function requireSubscription(): RequestHandler {
  return async (req, _res, next) => {
    try {
      const tenantId = req.auth?.tenantId;
      if (!tenantId) return next(new PaymentRequiredError());

      const tenant = await prisma.tenant.findUnique({
        where:  { id: tenantId },
        select: { subscriptionStatus: true, trialEndsAt: true },
      });

      if (!tenant) return next(new PaymentRequiredError());

      const isActive  = tenant.subscriptionStatus === 'ACTIVE';
      const inTrial   = tenant.subscriptionStatus === 'TRIAL' && new Date() < tenant.trialEndsAt;

      if (!isActive && !inTrial) {
        return next(new PaymentRequiredError());
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
