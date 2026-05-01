ALTER TABLE "CatalogSeries"
  ADD COLUMN IF NOT EXISTS "catalogSource" TEXT NOT NULL DEFAULT 'dracinku',
  ADD COLUMN IF NOT EXISTS "providerRawPayload" JSONB;

ALTER TABLE "CatalogEpisode"
  ALTER COLUMN "videoUrl" SET DEFAULT '',
  ADD COLUMN IF NOT EXISTS "upstreamEpisodeId" TEXT,
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "playbackSources" JSONB,
  ADD COLUMN IF NOT EXISTS "playbackSubtitles" JSONB,
  ADD COLUMN IF NOT EXISTS "playbackExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "providerRawPayload" JSONB;

CREATE TABLE IF NOT EXISTS "ProviderSyncJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL DEFAULT 'catalog',
  "providerCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "payload" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 50,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "workerId" TEXT,
  "lastError" TEXT NOT NULL DEFAULT '',
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProviderWorkerLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workerId" TEXT,
  "jobId" UUID,
  "level" TEXT NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderWorkerLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatalogSeries_catalogSource_isHomepageVisible_updatedAt_idx"
  ON "CatalogSeries"("catalogSource", "isHomepageVisible", "updatedAt");

CREATE INDEX IF NOT EXISTS "CatalogEpisode_seriesId_upstreamEpisodeId_idx"
  ON "CatalogEpisode"("seriesId", "upstreamEpisodeId");

CREATE INDEX IF NOT EXISTS "ProviderSyncJob_status_scheduledAt_priority_idx"
  ON "ProviderSyncJob"("status", "scheduledAt", "priority");

CREATE INDEX IF NOT EXISTS "ProviderSyncJob_claim_queued_idx"
  ON "ProviderSyncJob"("priority" DESC, "scheduledAt" ASC, "createdAt" ASC)
  WHERE "status" = 'queued';

CREATE INDEX IF NOT EXISTS "ProviderSyncJob_providerCode_status_createdAt_idx"
  ON "ProviderSyncJob"("providerCode", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ProviderWorkerLog_createdAt_idx"
  ON "ProviderWorkerLog"("createdAt");

CREATE INDEX IF NOT EXISTS "ProviderWorkerLog_jobId_idx"
  ON "ProviderWorkerLog"("jobId");
