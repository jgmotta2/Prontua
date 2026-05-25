-- CreateEnum
CREATE TYPE IF NOT EXISTS "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- AlterTable tenants: add subscription fields
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "trialEndsAt"          TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '3 days',
  ADD COLUMN IF NOT EXISTS "subscriptionStatus"   "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS "stripeCustomerId"      TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId"  TEXT;
