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

CREATE UNIQUE INDEX IF NOT EXISTS "ChatReaction_messageId_userId_emoji_key"
  ON "ChatReaction"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "ChatReaction_messageId_createdAt_idx"
  ON "ChatReaction"("messageId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatReaction_userId_idx"
  ON "ChatReaction"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ChatReaction_messageId_fkey'
      AND conrelid = '"ChatReaction"'::regclass
  ) THEN
    ALTER TABLE "ChatReaction"
      ADD CONSTRAINT "ChatReaction_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ChatReaction_userId_fkey'
      AND conrelid = '"ChatReaction"'::regclass
  ) THEN
    ALTER TABLE "ChatReaction"
      ADD CONSTRAINT "ChatReaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
