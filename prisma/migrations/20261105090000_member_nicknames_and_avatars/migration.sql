ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "nickname" TEXT,
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

UPDATE "User"
SET "nickname" = 'Trader-' || SUBSTRING(MD5("id") FROM 1 FOR 8)
WHERE "nickname" IS NULL OR BTRIM("nickname") = '';

ALTER TABLE "User" ALTER COLUMN "nickname" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_nickname_key"
  ON "User"("nickname");

CREATE UNIQUE INDEX IF NOT EXISTS "User_nickname_lower_key"
  ON "User"(LOWER("nickname"));
