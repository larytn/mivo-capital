ALTER TABLE "JournalTrade"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "brokerConnectionId" TEXT;

CREATE TABLE "BrokerConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'MT5',
  "server" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AWAITING_CREDENTIALS',
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrokerConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrokerConnection_userId_key" ON "BrokerConnection"("userId");
CREATE UNIQUE INDEX "BrokerConnection_providerAccountId_key" ON "BrokerConnection"("providerAccountId");
CREATE INDEX "BrokerConnection_status_idx" ON "BrokerConnection"("status");
CREATE UNIQUE INDEX "JournalTrade_userId_source_externalId_key"
  ON "JournalTrade"("userId", "source", "externalId");
CREATE INDEX "JournalTrade_brokerConnectionId_idx"
  ON "JournalTrade"("brokerConnectionId");

ALTER TABLE "BrokerConnection"
ADD CONSTRAINT "BrokerConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalTrade"
ADD CONSTRAINT "JournalTrade_brokerConnectionId_fkey"
FOREIGN KEY ("brokerConnectionId") REFERENCES "BrokerConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
