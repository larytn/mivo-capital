-- Additive, repeatable schema repair for databases created before the Mivo
-- trading ecosystem models were added. This intentionally preserves legacy
-- tables and rows.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isVip" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "JournalTrade" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CLOSED',
  "entryPrice" DOUBLE PRECISION NOT NULL,
  "exitPrice" DOUBLE PRECISION,
  "stopLoss" DOUBLE PRECISION,
  "takeProfit" DOUBLE PRECISION,
  "quantity" DOUBLE PRECISION,
  "riskAmount" DOUBLE PRECISION,
  "pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "openedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "strategy" TEXT,
  "notes" TEXT,
  "screenshotUrl" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "externalId" TEXT,
  "brokerConnectionId" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalTrade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BrokerConnection" (
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

CREATE TABLE IF NOT EXISTS "CommunityPost" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Market Analysis',
  "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "imageUrl" TEXT,
  "tradingViewUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CommunityPost"
  ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "CommunityPost"
  ALTER COLUMN "moderationStatus" SET DEFAULT 'PENDING';
ALTER TABLE "CommunityPost"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "tradingViewUrl" TEXT;

CREATE TABLE IF NOT EXISTS "CommunityLike" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommunityComment" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ChatMessage"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS "mediaKey" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;

CREATE TABLE IF NOT EXISTS "ChatReaction" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatSavedSticker" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "stickerKey" TEXT,
  "mediaUrl" TEXT,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatSavedSticker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PropertyListing" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "propertyType" TEXT NOT NULL,
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "imageUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PropertyListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "adminReply" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EcosystemContent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "symbol" TEXT,
  "direction" TEXT,
  "entry" TEXT,
  "stopLoss" TEXT,
  "takeProfit" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcosystemContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EcosystemContentReadState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "lastViewedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcosystemContentReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BrokerConnection_userId_key" ON "BrokerConnection"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "BrokerConnection_providerAccountId_key" ON "BrokerConnection"("providerAccountId");
CREATE INDEX IF NOT EXISTS "BrokerConnection_status_idx" ON "BrokerConnection"("status");
CREATE INDEX IF NOT EXISTS "JournalTrade_userId_openedAt_idx" ON "JournalTrade"("userId", "openedAt");
CREATE INDEX IF NOT EXISTS "JournalTrade_userId_isPublic_idx" ON "JournalTrade"("userId", "isPublic");
CREATE UNIQUE INDEX IF NOT EXISTS "JournalTrade_userId_source_externalId_key" ON "JournalTrade"("userId", "source", "externalId");
CREATE INDEX IF NOT EXISTS "JournalTrade_brokerConnectionId_idx" ON "JournalTrade"("brokerConnectionId");
CREATE INDEX IF NOT EXISTS "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_category_createdAt_idx" ON "CommunityPost"("category", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_moderationStatus_createdAt_idx" ON "CommunityPost"("moderationStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityLike_postId_userId_key" ON "CommunityLike"("postId", "userId");
CREATE INDEX IF NOT EXISTS "CommunityLike_userId_idx" ON "CommunityLike"("userId");
CREATE INDEX IF NOT EXISTS "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityComment_authorId_idx" ON "CommunityComment"("authorId");
CREATE INDEX IF NOT EXISTS "CommunityComment_parentId_idx" ON "CommunityComment"("parentId");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatReaction_messageId_userId_emoji_key" ON "ChatReaction"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "ChatReaction_messageId_createdAt_idx" ON "ChatReaction"("messageId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatReaction_userId_idx" ON "ChatReaction"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatSavedSticker_userId_key_key" ON "ChatSavedSticker"("userId", "key");
CREATE INDEX IF NOT EXISTS "ChatSavedSticker_userId_createdAt_idx" ON "ChatSavedSticker"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PropertyListing_status_createdAt_idx" ON "PropertyListing"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "EcosystemContent_type_published_createdAt_idx" ON "EcosystemContent"("type", "published", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "EcosystemContentReadState_userId_contentType_key" ON "EcosystemContentReadState"("userId", "contentType");
CREATE INDEX IF NOT EXISTS "EcosystemContentReadState_contentType_lastViewedAt_idx" ON "EcosystemContentReadState"("contentType", "lastViewedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalTrade_userId_fkey' AND conrelid = '"JournalTrade"'::regclass) THEN
    ALTER TABLE "JournalTrade" ADD CONSTRAINT "JournalTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalTrade_brokerConnectionId_fkey' AND conrelid = '"JournalTrade"'::regclass) THEN
    ALTER TABLE "JournalTrade" ADD CONSTRAINT "JournalTrade_brokerConnectionId_fkey" FOREIGN KEY ("brokerConnectionId") REFERENCES "BrokerConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BrokerConnection_userId_fkey' AND conrelid = '"BrokerConnection"'::regclass) THEN
    ALTER TABLE "BrokerConnection" ADD CONSTRAINT "BrokerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityPost_authorId_fkey' AND conrelid = '"CommunityPost"'::regclass) THEN
    ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityLike_postId_fkey' AND conrelid = '"CommunityLike"'::regclass) THEN
    ALTER TABLE "CommunityLike" ADD CONSTRAINT "CommunityLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityLike_userId_fkey' AND conrelid = '"CommunityLike"'::regclass) THEN
    ALTER TABLE "CommunityLike" ADD CONSTRAINT "CommunityLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityComment_postId_fkey' AND conrelid = '"CommunityComment"'::regclass) THEN
    ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityComment_authorId_fkey' AND conrelid = '"CommunityComment"'::regclass) THEN
    ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityComment_parentId_fkey' AND conrelid = '"CommunityComment"'::regclass) THEN
    ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_authorId_fkey' AND conrelid = '"ChatMessage"'::regclass) THEN
    ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatReaction_messageId_fkey' AND conrelid = '"ChatReaction"'::regclass) THEN
    ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatReaction_userId_fkey' AND conrelid = '"ChatReaction"'::regclass) THEN
    ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatSavedSticker_userId_fkey' AND conrelid = '"ChatSavedSticker"'::regclass) THEN
    ALTER TABLE "ChatSavedSticker" ADD CONSTRAINT "ChatSavedSticker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PropertyListing_createdById_fkey' AND conrelid = '"PropertyListing"'::regclass) THEN
    ALTER TABLE "PropertyListing" ADD CONSTRAINT "PropertyListing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicket_userId_fkey' AND conrelid = '"SupportTicket"'::regclass) THEN
    ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EcosystemContent_createdById_fkey' AND conrelid = '"EcosystemContent"'::regclass) THEN
    ALTER TABLE "EcosystemContent" ADD CONSTRAINT "EcosystemContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EcosystemContentReadState_userId_fkey' AND conrelid = '"EcosystemContentReadState"'::regclass) THEN
    ALTER TABLE "EcosystemContentReadState" ADD CONSTRAINT "EcosystemContentReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
