-- Create the provider directory foundation used by live CopyFactory accounts.
-- Legacy simulated-account and paper-copy tables are intentionally excluded.
CREATE TABLE IF NOT EXISTS "CopyTraderProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bio" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "markets" TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewFeedback" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "consentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CopyTraderProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CopyTraderProfile" ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT;
ALTER TABLE "CopyTraderProfile" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "CopyTraderProfile" ADD COLUMN IF NOT EXISTS "reviewFeedback" TEXT;
ALTER TABLE "CopyTraderProfile" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "CopyTraderProfile" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "CopyTraderProfile" ADD COLUMN IF NOT EXISTS "consentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "CopyTraderProfile_userId_key" ON "CopyTraderProfile"("userId");
CREATE INDEX IF NOT EXISTS "CopyTraderProfile_status_createdAt_idx" ON "CopyTraderProfile"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "CopyTradingAudit" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "notes" TEXT,
  "assessment" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopyTradingAudit_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CopyTradingAudit" ADD COLUMN IF NOT EXISTS "assessment" JSONB;
CREATE INDEX IF NOT EXISTS "CopyTradingAudit_profileId_createdAt_idx" ON "CopyTradingAudit"("profileId", "createdAt");

ALTER TABLE "JournalTrade" ADD COLUMN IF NOT EXISTS "currentPrice" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "JournalTrade_userId_source_status_closedAt_idx"
  ON "JournalTrade"("userId", "source", "status", "closedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTraderProfile_userId_fkey' AND conrelid = '"CopyTraderProfile"'::regclass) THEN
    ALTER TABLE "CopyTraderProfile" ADD CONSTRAINT "CopyTraderProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingAudit_adminId_fkey' AND conrelid = '"CopyTradingAudit"'::regclass) THEN
    ALTER TABLE "CopyTradingAudit" ADD CONSTRAINT "CopyTradingAudit_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingAudit_profileId_fkey' AND conrelid = '"CopyTradingAudit"'::regclass) THEN
    ALTER TABLE "CopyTradingAudit" ADD CONSTRAINT "CopyTradingAudit_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "CopyTraderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
