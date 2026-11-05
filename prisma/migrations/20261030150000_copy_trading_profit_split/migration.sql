DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CopyTraderProfile' AND column_name = 'providerCommissionRate')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CopyTraderProfile' AND column_name = 'copierProfitShareRate') THEN
    ALTER TABLE "CopyTraderProfile" RENAME COLUMN "providerCommissionRate" TO "copierProfitShareRate";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CopyTraderProfile' AND column_name = 'copierProfitShareRate') THEN
    ALTER TABLE "CopyTraderProfile" ADD COLUMN "copierProfitShareRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CopyTraderProfile' AND column_name = 'profitSplitVersion') THEN
    ALTER TABLE "CopyTraderProfile" ADD COLUMN "profitSplitVersion" INTEGER NOT NULL DEFAULT 1;
  END IF;
  ALTER TABLE "CopyTraderProfile" ALTER COLUMN "profitSplitVersion" SET DEFAULT 2;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'providerRateAtStart')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'copierShareRateAtStart') THEN
    ALTER TABLE "LiveCopyRelationship" RENAME COLUMN "providerRateAtStart" TO "copierShareRateAtStart";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'copierShareRateAtStart') THEN
    ALTER TABLE "LiveCopyRelationship" ADD COLUMN "copierShareRateAtStart" DOUBLE PRECISION NOT NULL DEFAULT 0.3;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'platformRate')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'mivoShareRateAtStart') THEN
    ALTER TABLE "LiveCopyRelationship" RENAME COLUMN "platformRate" TO "mivoShareRateAtStart";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'mivoShareRateAtStart') THEN
    ALTER TABLE "LiveCopyRelationship" ADD COLUMN "mivoShareRateAtStart" DOUBLE PRECISION NOT NULL DEFAULT 0.1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'providerShareRateAtStart') THEN
    ALTER TABLE "LiveCopyRelationship" ADD COLUMN "providerShareRateAtStart" DOUBLE PRECISION NOT NULL DEFAULT 0.6;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LiveCopyRelationship' AND column_name = 'profitSplitVersion') THEN
    ALTER TABLE "LiveCopyRelationship" ADD COLUMN "profitSplitVersion" INTEGER NOT NULL DEFAULT 1;
  END IF;
  ALTER TABLE "LiveCopyRelationship" ALTER COLUMN "profitSplitVersion" SET DEFAULT 2;

  IF to_regclass('"CopyTradingLedgerEntry"') IS NOT NULL THEN
    ALTER TABLE "CopyTradingLedgerEntry" ADD COLUMN IF NOT EXISTS "eligibleProfit" DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE "CopyTradingLedgerEntry" ADD COLUMN IF NOT EXISTS "copierProfitShareRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3;
    ALTER TABLE "CopyTradingLedgerEntry" ADD COLUMN IF NOT EXISTS "mivoProfitShareRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1;
    ALTER TABLE "CopyTradingLedgerEntry" ADD COLUMN IF NOT EXISTS "copierShareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE "CopyTradingLedgerEntry" ADD COLUMN IF NOT EXISTS "providerShareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
  END IF;
END $$;
