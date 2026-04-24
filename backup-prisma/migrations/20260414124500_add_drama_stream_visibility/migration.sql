ALTER TABLE "Drama"
ADD COLUMN "isStreamPlayable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "streamCheckMessage" TEXT NOT NULL DEFAULT '',
ADD COLUMN "streamCheckedAt" TIMESTAMP(3);

CREATE INDEX "Drama_isStreamPlayable_updatedAt_idx" ON "Drama"("isStreamPlayable", "updatedAt");
