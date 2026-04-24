SET lock_timeout = '5s';
SET statement_timeout = '0';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogLanguage_platformId_isActive_idx"
  ON "CatalogLanguage" ("platformId", "isActive");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogTab_platformId_languageId_isActive_idx"
  ON "CatalogTab" ("platformId", "languageId", "isActive");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogTab_type_sortOrder_idx"
  ON "CatalogTab" ("type", "sortOrder");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogSeries_platformId_languageId_updatedAt_idx"
  ON "CatalogSeries" ("platformId", "languageId", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogSeries_isHomepageVisible_updatedAt_idx"
  ON "CatalogSeries" ("isHomepageVisible", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogSeries_title_updatedAt_idx"
  ON "CatalogSeries" ("title", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogTabSeries_tabId_rank_idx"
  ON "CatalogTabSeries" ("tabId", "rank");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogTabSeries_seriesId_updatedAt_idx"
  ON "CatalogTabSeries" ("seriesId", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogEpisode_seriesId_updatedAt_idx"
  ON "CatalogEpisode" ("seriesId", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogSyncState_scope_status_updatedAt_idx"
  ON "CatalogSyncState" ("scope", "status", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogSyncJob_status_updatedAt_idx"
  ON "CatalogSyncJob" ("status", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogSyncJob_status_leaseExpiresAt_idx"
  ON "CatalogSyncJob" ("status", "leaseExpiresAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CatalogSyncJob_languageCode_createdAt_idx"
  ON "CatalogSyncJob" ("languageCode", "createdAt");

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "FavoriteDrama_userId_seriesId_key"
  ON "FavoriteDrama" ("userId", "seriesId")
  WHERE "seriesId" IS NOT NULL;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "SavedEpisode_userId_seriesId_episodeIndex_key"
  ON "SavedEpisode" ("userId", "seriesId", "episodeIndex")
  WHERE "seriesId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "SavedEpisode_seriesId_updatedAt_idx"
  ON "SavedEpisode" ("seriesId", "updatedAt")
  WHERE "seriesId" IS NOT NULL;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "WatchHistory_userId_seriesId_key"
  ON "WatchHistory" ("userId", "seriesId")
  WHERE "seriesId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "WatchHistory_seriesId_updatedAt_idx"
  ON "WatchHistory" ("seriesId", "updatedAt")
  WHERE "seriesId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "DramaChannelBroadcast_seriesId_createdAt_idx"
  ON "DramaChannelBroadcast" ("seriesId", "createdAt")
  WHERE "seriesId" IS NOT NULL;
