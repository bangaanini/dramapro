CREATE TABLE "CatalogSyncJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" TEXT NOT NULL DEFAULT 'queued',
    "languageCode" TEXT NOT NULL DEFAULT 'id',
    "phase" TEXT NOT NULL DEFAULT 'init-platform',
    "platformIndex" INTEGER NOT NULL DEFAULT 0,
    "currentPlatformId" TEXT NOT NULL DEFAULT '',
    "currentTabId" UUID,
    "currentTabName" TEXT NOT NULL DEFAULT '',
    "totalPlatforms" INTEGER NOT NULL DEFAULT 0,
    "completedPlatforms" INTEGER NOT NULL DEFAULT 0,
    "totalTabs" INTEGER NOT NULL DEFAULT 0,
    "completedTabs" INTEGER NOT NULL DEFAULT 0,
    "totalTitles" INTEGER NOT NULL DEFAULT 0,
    "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
    "pendingDetails" INTEGER NOT NULL DEFAULT 0,
    "processedDetails" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "recentErrors" JSONB,
    "recentLogs" JSONB,
    "lastMessage" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogSyncJob_status_updatedAt_idx" ON "CatalogSyncJob"("status", "updatedAt");
CREATE INDEX "CatalogSyncJob_languageCode_createdAt_idx" ON "CatalogSyncJob"("languageCode", "createdAt");
