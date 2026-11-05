CREATE TABLE IF NOT EXISTS "VipSignal" (
  "id" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL,
  "entryLow" DOUBLE PRECISION NOT NULL,
  "entryHigh" DOUBLE PRECISION NOT NULL,
  "stopLoss" DOUBLE PRECISION NOT NULL,
  "takeProfits" JSONB NOT NULL,
  "thesis" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "outcomeNote" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VipSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VipSignal_status_publishedAt_idx" ON "VipSignal"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "VipSignal_createdById_publishedAt_idx" ON "VipSignal"("createdById", "publishedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'VipSignal_createdById_fkey'
      AND conrelid = '"VipSignal"'::regclass
  ) THEN
    ALTER TABLE "VipSignal"
      ADD CONSTRAINT "VipSignal_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
