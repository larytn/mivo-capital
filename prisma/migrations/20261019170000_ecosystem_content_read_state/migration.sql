CREATE TABLE IF NOT EXISTS "EcosystemContentReadState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "lastViewedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EcosystemContentReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EcosystemContentReadState_userId_contentType_key"
  ON "EcosystemContentReadState"("userId", "contentType");
CREATE INDEX IF NOT EXISTS "EcosystemContentReadState_contentType_lastViewedAt_idx"
  ON "EcosystemContentReadState"("contentType", "lastViewedAt");

ALTER TABLE "EcosystemContentReadState"
  ADD CONSTRAINT "EcosystemContentReadState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
