ALTER TABLE "CommunityPost"
  ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "CommunityPost_moderationStatus_createdAt_idx"
  ON "CommunityPost"("moderationStatus", "createdAt");
