import Stripe from 'stripe';
import { env } from '@config/env';
import { prisma } from '@config/prisma';
import { logger } from '@shared/utils/logger';

const stripeInstance = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null;

function requireStripe() {
  if (!stripeInstance) throw new Error('Stripe não configurado. Defina STRIPE_SECRET_KEY no .env');
  return stripeInstance;
}

export const billingService = {
  async createCheckoutSession(opts: {
    tenantId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const s = requireStripe();
    const priceId = env.STRIPE_PRICE_ID;
    if (!priceId) throw new Error('STRIPE_PRICE_ID não configurado');

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where:  { id: opts.tenantId },
      select: { stripeCustomerId: true, name: true },
    });

    let customerId = tenant.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await s.customers.create({
        email:    opts.userEmail,
        name:     tenant.name,
        metadata: { tenantId: opts.tenantId },
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: opts.tenantId },
        data:  { stripeCustomerId: customerId },
      });
    }

    const session = await s.checkout.sessions.create({
      customer:              customerId,
      mode:                  'subscription',
      line_items:            [{ price: priceId, quantity: 1 }],
      success_url:           opts.successUrl,
      cancel_url:            opts.cancelUrl,
      client_reference_id:   opts.tenantId,
      allow_promotion_codes: true,
    });

    return session.url!;
  },

  async createPortalSession(opts: {
    tenantId: string;
    returnUrl: string;
  }): Promise<string> {
    const s = requireStripe();

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where:  { id: opts.tenantId },
      select: { stripeCustomerId: true },
    });

    if (!tenant.stripeCustomerId) {
      throw new Error('Nenhuma assinatura ativa encontrada');
    }

    const session = await s.billingPortal.sessions.create({
      customer:   tenant.stripeCustomerId,
      return_url: opts.returnUrl,
    });

    return session.url;
  },

  async getStatus(tenantId: string) {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where:  { id: tenantId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    });

    const now           = new Date();
    const trialDaysLeft = Math.max(
      0,
      Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const inTrial  = tenant.subscriptionStatus === 'TRIAL' && now < tenant.trialEndsAt;
    const isActive = tenant.subscriptionStatus === 'ACTIVE';
    const isExpired = !inTrial && !isActive;

    return {
      subscriptionStatus: tenant.subscriptionStatus,
      trialEndsAt:        tenant.trialEndsAt.toISOString(),
      trialDaysLeft,
      inTrial,
      isActive,
      isExpired,
    };
  },

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const s = requireStripe();
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET não configurado');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = s.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
      logger.warn({ err }, 'stripe_webhook_signature_invalid');
      throw new Error(`Webhook signature inválida: ${err.message}`);
    }

    switch (event.type as string) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub      = event.data.object;
        const tenantId = sub.metadata?.['tenantId'] ?? await tenantIdFromCustomer(sub.customer as string);
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data:  { subscriptionStatus: 'CANCELED', stripeSubscriptionId: sub.id as string },
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv      = event.data.object;
        const tenantId = await tenantIdFromCustomer(inv.customer as string);
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data:  { subscriptionStatus: 'PAST_DUE' },
          });
        }
        break;
      }
      default:
        break;
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncSubscription(sub: any): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const tenantId = sub.metadata?.['tenantId'] ?? await tenantIdFromCustomer(sub.customer as string);
  if (!tenantId) {
    logger.warn({ subId: sub.id }, 'stripe_webhook_tenant_not_found');
    return;
  }

  const statusMap: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED'> = {
    active:   'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid:   'PAST_DUE',
  };

  const status = statusMap[sub.status] ?? 'PAST_DUE';

  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { subscriptionStatus: status, stripeSubscriptionId: sub.id },
  });
}

async function tenantIdFromCustomer(customerId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findFirst({
    where:  { stripeCustomerId: customerId },
    select: { id: true },
  });
  return tenant?.id ?? null;
}
