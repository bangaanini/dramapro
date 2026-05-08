ALTER TABLE "TelegramPartnerBot"
  ADD COLUMN IF NOT EXISTS "downloadEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "downloadDailyLimit" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "PartnerBotDownloadLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "partnerBotId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "seriesId" UUID NOT NULL,
  "episodeIndex" INTEGER NOT NULL,
  "periodKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerBotDownloadLog_partnerBotId_fkey"
    FOREIGN KEY ("partnerBotId") REFERENCES "TelegramPartnerBot"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerBotDownloadLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerBotDownloadLog_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerBotDownloadLog_partnerBotId_userId_seriesId_episodeIndex_periodKey_key"
  ON "PartnerBotDownloadLog"("partnerBotId", "userId", "seriesId", "episodeIndex", "periodKey");

CREATE INDEX IF NOT EXISTS "PartnerBotDownloadLog_partnerBotId_userId_periodKey_idx"
  ON "PartnerBotDownloadLog"("partnerBotId", "userId", "periodKey");

CREATE INDEX IF NOT EXISTS "PartnerBotDownloadLog_userId_createdAt_idx"
  ON "PartnerBotDownloadLog"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PartnerBotDownloadLog_seriesId_createdAt_idx"
  ON "PartnerBotDownloadLog"("seriesId", "createdAt");
