ALTER TABLE "CopyTraderProfile"
  ADD COLUMN IF NOT EXISTS "providerRegion" TEXT;

CREATE TABLE IF NOT EXISTS "CopyTradingLedgerEntry" (
  "id" TEXT NOT NULL,
  "sourceTransactionId" TEXT NOT NULL,
  "sourceSubscriberId" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "relationshipId" TEXT,
  "accountId" TEXT NOT NULL,
  "transactionAt" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL,
  "symbol" TEXT,
  "positionId" TEXT,
  "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "improvement" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "providerCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "mivoShareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "copyFactoryPlatformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "collectionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "collectedAt" TIMESTAMP(3),
  "collectionReference" TEXT,
  "providerPayoutStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "providerPaidAt" TIMESTAMP(3),
  "providerPayoutReference" TEXT,
  "mivoReceiptStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "mivoReceivedAt" TIMESTAMP(3),
  "mivoReceiptReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CopyTradingLedgerEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CopyTradingLedgerEntry"
  ADD COLUMN IF NOT EXISTS "copyFactoryPlatformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CopyTradingLedgerEvent" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopyTradingLedgerEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CopyTradingLedgerEntry_sourceTransactionId_sourceSubscriberId_key"
  ON "CopyTradingLedgerEntry"("sourceTransactionId", "sourceSubscriberId");
CREATE INDEX IF NOT EXISTS "CopyTradingLedgerEntry_transactionAt_idx"
  ON "CopyTradingLedgerEntry"("transactionAt");
CREATE INDEX IF NOT EXISTS "CopyTradingLedgerEntry_profileId_transactionAt_idx"
  ON "CopyTradingLedgerEntry"("profileId", "transactionAt");
CREATE INDEX IF NOT EXISTS "CopyTradingLedgerEntry_collectionStatus_transactionAt_idx"
  ON "CopyTradingLedgerEntry"("collectionStatus", "transactionAt");
CREATE INDEX IF NOT EXISTS "CopyTradingLedgerEntry_providerPayoutStatus_transactionAt_idx"
  ON "CopyTradingLedgerEntry"("providerPayoutStatus", "transactionAt");
CREATE INDEX IF NOT EXISTS "CopyTradingLedgerEntry_mivoReceiptStatus_transactionAt_idx"
  ON "CopyTradingLedgerEntry"("mivoReceiptStatus", "transactionAt");
CREATE INDEX IF NOT EXISTS "CopyTradingLedgerEvent_entryId_createdAt_idx"
  ON "CopyTradingLedgerEvent"("entryId", "createdAt");
CREATE INDEX IF NOT EXISTS "CopyTradingLedgerEvent_adminId_createdAt_idx"
  ON "CopyTradingLedgerEvent"("adminId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingLedgerEntry_profileId_fkey' AND conrelid = '"CopyTradingLedgerEntry"'::regclass) THEN
    ALTER TABLE "CopyTradingLedgerEntry" ADD CONSTRAINT "CopyTradingLedgerEntry_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "CopyTraderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingLedgerEntry_relationshipId_fkey' AND conrelid = '"CopyTradingLedgerEntry"'::regclass) THEN
    ALTER TABLE "CopyTradingLedgerEntry" ADD CONSTRAINT "CopyTradingLedgerEntry_relationshipId_fkey"
      FOREIGN KEY ("relationshipId") REFERENCES "LiveCopyRelationship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingLedgerEntry_accountId_fkey' AND conrelid = '"CopyTradingLedgerEntry"'::regclass) THEN
    ALTER TABLE "CopyTradingLedgerEntry" ADD CONSTRAINT "CopyTradingLedgerEntry_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "CopyTradingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingLedgerEvent_entryId_fkey' AND conrelid = '"CopyTradingLedgerEvent"'::regclass) THEN
    ALTER TABLE "CopyTradingLedgerEvent" ADD CONSTRAINT "CopyTradingLedgerEvent_entryId_fkey"
      FOREIGN KEY ("entryId") REFERENCES "CopyTradingLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CopyTradingLedgerEvent_adminId_fkey' AND conrelid = '"CopyTradingLedgerEvent"'::regclass) THEN
    ALTER TABLE "CopyTradingLedgerEvent" ADD CONSTRAINT "CopyTradingLedgerEvent_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
