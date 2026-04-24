SET lock_timeout = '5s';
SET statement_timeout = '0';

ALTER TABLE "FavoriteDrama"
  ALTER COLUMN "dramaId" DROP NOT NULL;

ALTER TABLE "SavedEpisode"
  ALTER COLUMN "dramaId" DROP NOT NULL;

ALTER TABLE "WatchHistory"
  ALTER COLUMN "dramaId" DROP NOT NULL;

DROP INDEX CONCURRENTLY IF EXISTS "FavoriteDrama_userId_seriesId_key";
CREATE UNIQUE INDEX CONCURRENTLY "FavoriteDrama_userId_seriesId_key"
  ON "FavoriteDrama" ("userId", "seriesId");

DROP INDEX CONCURRENTLY IF EXISTS "SavedEpisode_userId_seriesId_episodeIndex_key";
CREATE UNIQUE INDEX CONCURRENTLY "SavedEpisode_userId_seriesId_episodeIndex_key"
  ON "SavedEpisode" ("userId", "seriesId", "episodeIndex");

DROP INDEX CONCURRENTLY IF EXISTS "WatchHistory_userId_seriesId_key";
CREATE UNIQUE INDEX CONCURRENTLY "WatchHistory_userId_seriesId_key"
  ON "WatchHistory" ("userId", "seriesId");
