SET lock_timeout = '5s';
SET statement_timeout = '0';

ALTER TABLE "FavoriteDrama"
  VALIDATE CONSTRAINT "FavoriteDrama_seriesId_fkey";

ALTER TABLE "SavedEpisode"
  VALIDATE CONSTRAINT "SavedEpisode_seriesId_fkey";

ALTER TABLE "WatchHistory"
  VALIDATE CONSTRAINT "WatchHistory_seriesId_fkey";

ALTER TABLE "DramaChannelBroadcast"
  VALIDATE CONSTRAINT "DramaChannelBroadcast_seriesId_fkey";

SELECT conname, convalidated
FROM pg_constraint
WHERE conname IN (
  'FavoriteDrama_seriesId_fkey',
  'SavedEpisode_seriesId_fkey',
  'WatchHistory_seriesId_fkey',
  'DramaChannelBroadcast_seriesId_fkey'
)
ORDER BY conname;
