-- Idempotente: em instalações novas, init (20260519) já criou enum e colunas.
DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "trialEndsAt"          TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '3 days',
  ADD COLUMN IF NOT EXISTS "subscriptionStatus"   "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS "stripeCustomerId"      TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId"  TEXT;
