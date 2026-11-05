ALTER TABLE "CopyTraderProfile"
  ADD COLUMN IF NOT EXISTS "brokerReferralConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "brokerReferralUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "brokerAccountLogin" TEXT,
  ADD COLUMN IF NOT EXISTS "brokerServer" TEXT,
  ADD COLUMN IF NOT EXISTS "ibVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ibVerificationReference" TEXT;
