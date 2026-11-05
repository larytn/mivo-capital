ALTER TABLE "CopyTraderProfile"
  ADD COLUMN IF NOT EXISTS "providerBrokerConnectionId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "copyFactoryStrategyId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS "copyFactoryStatus" TEXT NOT NULL DEFAULT 'NOT_ENABLED';

CREATE UNIQUE INDEX IF NOT EXISTS "CopyTraderProfile_copyFactoryStrategyId_key"
  ON "CopyTraderProfile"("copyFactoryStrategyId");

CREATE TABLE IF NOT EXISTS "CopyTradingAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "metaApiAccountId" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "server" TEXT NOT NULL,
  "loginHint" TEXT NOT NULL,
  "accountCurrency" TEXT NOT NULL,
  "balance" DOUBLE PRECISION,
  "equity" DOUBLE PRECISION,
  "tradeMode" TEXT NOT NULL,
  "marginMode" TEXT NOT NULL,
  "connectionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "copyFactoryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CopyTradingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LiveCopyRelationship" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "riskPercent" DOUBLE PRECISION NOT NULL,
  "providerRateAtStart" DOUBLE PRECISION NOT NULL,
  "platformRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stoppedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveCopyRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CopyTradingAccount_metaApiAccountId_key"
  ON "CopyTradingAccount"("metaApiAccountId");
CREATE INDEX IF NOT EXISTS "CopyTradingAccount_userId_createdAt_idx"
  ON "CopyTradingAccount"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CopyTradingAccount_connectionStatus_copyFactoryEnabled_idx"
  ON "CopyTradingAccount"("connectionStatus", "copyFactoryEnabled");
CREATE UNIQUE INDEX IF NOT EXISTS "LiveCopyRelationship_followerId_profileId_accountId_key"
  ON "LiveCopyRelationship"("followerId", "profileId", "accountId");
CREATE INDEX IF NOT EXISTS "LiveCopyRelationship_followerId_status_idx"
  ON "LiveCopyRelationship"("followerId", "status");
CREATE INDEX IF NOT EXISTS "LiveCopyRelationship_profileId_status_idx"
  ON "LiveCopyRelationship"("profileId", "status");
CREATE INDEX IF NOT EXISTS "LiveCopyRelationship_accountId_status_idx"
  ON "LiveCopyRelationship"("accountId", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingAccount_userId_fkey' AND conrelid = '"CopyTradingAccount"'::regclass) THEN
    ALTER TABLE "CopyTradingAccount" ADD CONSTRAINT "CopyTradingAccount_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveCopyRelationship_followerId_fkey' AND conrelid = '"LiveCopyRelationship"'::regclass) THEN
    ALTER TABLE "LiveCopyRelationship" ADD CONSTRAINT "LiveCopyRelationship_followerId_fkey"
      FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveCopyRelationship_profileId_fkey' AND conrelid = '"LiveCopyRelationship"'::regclass) THEN
    ALTER TABLE "LiveCopyRelationship" ADD CONSTRAINT "LiveCopyRelationship_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "CopyTraderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveCopyRelationship_accountId_fkey' AND conrelid = '"LiveCopyRelationship"'::regclass) THEN
    ALTER TABLE "LiveCopyRelationship" ADD CONSTRAINT "LiveCopyRelationship_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "CopyTradingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
