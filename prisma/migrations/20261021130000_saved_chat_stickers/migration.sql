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

CREATE UNIQUE INDEX IF NOT EXISTS "ChatSavedSticker_userId_key_key"
  ON "ChatSavedSticker"("userId", "key");
CREATE INDEX IF NOT EXISTS "ChatSavedSticker_userId_createdAt_idx"
  ON "ChatSavedSticker"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ChatSavedSticker_userId_fkey'
      AND conrelid = '"ChatSavedSticker"'::regclass
  ) THEN
    ALTER TABLE "ChatSavedSticker"
      ADD CONSTRAINT "ChatSavedSticker_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
