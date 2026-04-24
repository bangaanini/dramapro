SET lock_timeout = '5s';
SET statement_timeout = '0';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'CatalogSyncScope'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."CatalogSyncScope" AS ENUM ('tab', 'series');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'CatalogSyncStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."CatalogSyncStatus" AS ENUM ('pending', 'synced', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CatalogPlatform" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogPlatform_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatalogLanguage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "platformId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "upstreamCode" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogLanguage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogLanguage_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "CatalogPlatform"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CatalogTab" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "platformId" TEXT NOT NULL,
  "languageId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tabKey" TEXT NOT NULL,
  "positionIndex" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogTab_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogTab_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "CatalogPlatform"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CatalogTab_languageId_fkey"
    FOREIGN KEY ("languageId") REFERENCES "CatalogLanguage"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CatalogSeries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "platformId" TEXT NOT NULL,
  "languageId" UUID NOT NULL,
  "upstreamSeriesId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "coverUrl" TEXT NOT NULL DEFAULT '',
  "chapterCount" INTEGER NOT NULL DEFAULT 0,
  "playCount" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastDetailSyncedAt" TIMESTAMP(3),
  "isHomepageVisible" BOOLEAN NOT NULL DEFAULT true,
  "homepageHiddenReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogSeries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogSeries_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "CatalogPlatform"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CatalogSeries_languageId_fkey"
    FOREIGN KEY ("languageId") REFERENCES "CatalogLanguage"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CatalogTabSeries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tabId" UUID NOT NULL,
  "seriesId" UUID NOT NULL,
  "rank" INTEGER NOT NULL,
  "sourcePageNo" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogTabSeries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogTabSeries_tabId_fkey"
    FOREIGN KEY ("tabId") REFERENCES "CatalogTab"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CatalogTabSeries_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CatalogEpisode" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "seriesId" UUID NOT NULL,
  "episodeIndex" INTEGER NOT NULL,
  "episodeLabel" TEXT NOT NULL DEFAULT '',
  "videoUrl" TEXT NOT NULL,
  "quality" INTEGER,
  "subtitles" JSONB,
  "checksum" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogEpisode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogEpisode_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CatalogSyncState" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "scope" "public"."CatalogSyncScope" NOT NULL,
  "status" "public"."CatalogSyncStatus" NOT NULL DEFAULT 'pending',
  "tabId" UUID,
  "seriesId" UUID,
  "lastPageInfo" JSONB,
  "hasMore" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogSyncState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogSyncState_tabId_fkey"
    FOREIGN KEY ("tabId") REFERENCES "CatalogTab"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CatalogSyncState_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CatalogSyncJob" (
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
  "runnerId" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastHeartbeatAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogSyncJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FavoriteDrama"
  ADD COLUMN IF NOT EXISTS "seriesId" UUID;

ALTER TABLE "SavedEpisode"
  ADD COLUMN IF NOT EXISTS "seriesId" UUID;

ALTER TABLE "WatchHistory"
  ADD COLUMN IF NOT EXISTS "seriesId" UUID;

ALTER TABLE "DramaChannelBroadcast"
  ADD COLUMN IF NOT EXISTS "seriesId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FavoriteDrama_seriesId_fkey'
  ) THEN
    ALTER TABLE "FavoriteDrama"
      ADD CONSTRAINT "FavoriteDrama_seriesId_fkey"
      FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'SavedEpisode_seriesId_fkey'
  ) THEN
    ALTER TABLE "SavedEpisode"
      ADD CONSTRAINT "SavedEpisode_seriesId_fkey"
      FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WatchHistory_seriesId_fkey'
  ) THEN
    ALTER TABLE "WatchHistory"
      ADD CONSTRAINT "WatchHistory_seriesId_fkey"
      FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DramaChannelBroadcast_seriesId_fkey'
  ) THEN
    ALTER TABLE "DramaChannelBroadcast"
      ADD CONSTRAINT "DramaChannelBroadcast_seriesId_fkey"
      FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatalogLanguage_platformId_code_key'
  ) THEN
    ALTER TABLE "CatalogLanguage"
      ADD CONSTRAINT "CatalogLanguage_platformId_code_key"
      UNIQUE ("platformId", "code");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatalogTab_languageId_type_positionIndex_sortOrder_key'
  ) THEN
    ALTER TABLE "CatalogTab"
      ADD CONSTRAINT "CatalogTab_languageId_type_positionIndex_sortOrder_key"
      UNIQUE ("languageId", "type", "positionIndex", "sortOrder");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatalogSeries_platformId_languageId_upstreamSeriesId_key'
  ) THEN
    ALTER TABLE "CatalogSeries"
      ADD CONSTRAINT "CatalogSeries_platformId_languageId_upstreamSeriesId_key"
      UNIQUE ("platformId", "languageId", "upstreamSeriesId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatalogTabSeries_tabId_seriesId_key'
  ) THEN
    ALTER TABLE "CatalogTabSeries"
      ADD CONSTRAINT "CatalogTabSeries_tabId_seriesId_key"
      UNIQUE ("tabId", "seriesId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatalogEpisode_seriesId_episodeIndex_key'
  ) THEN
    ALTER TABLE "CatalogEpisode"
      ADD CONSTRAINT "CatalogEpisode_seriesId_episodeIndex_key"
      UNIQUE ("seriesId", "episodeIndex");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatalogSyncState_tabId_key'
  ) THEN
    ALTER TABLE "CatalogSyncState"
      ADD CONSTRAINT "CatalogSyncState_tabId_key"
      UNIQUE ("tabId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatalogSyncState_seriesId_key'
  ) THEN
    ALTER TABLE "CatalogSyncState"
      ADD CONSTRAINT "CatalogSyncState_seriesId_key"
      UNIQUE ("seriesId");
  END IF;
END $$;
