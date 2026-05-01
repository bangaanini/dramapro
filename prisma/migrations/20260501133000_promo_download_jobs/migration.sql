CREATE TABLE IF NOT EXISTS "PromoDownloadJob" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" UUID NOT NULL,
  "episodeIndex" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "sourceType" TEXT NOT NULL DEFAULT '',
  "qualityLabel" TEXT NOT NULL DEFAULT '',
  "outputPath" TEXT NOT NULL DEFAULT '',
  "fileSizeBytes" BIGINT,
  "error" TEXT NOT NULL DEFAULT '',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "workerId" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoDownloadJob_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoDownloadJob_seriesId_episodeIndex_key"
  ON "PromoDownloadJob"("seriesId", "episodeIndex");

CREATE INDEX IF NOT EXISTS "PromoDownloadJob_status_scheduledAt_idx"
  ON "PromoDownloadJob"("status", "scheduledAt");

CREATE INDEX IF NOT EXISTS "PromoDownloadJob_seriesId_status_idx"
  ON "PromoDownloadJob"("seriesId", "status");
