\echo '=== catalog tables ==='
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'CatalogPlatform',
    'CatalogLanguage',
    'CatalogTab',
    'CatalogSeries',
    'CatalogTabSeries',
    'CatalogEpisode',
    'CatalogSyncState',
    'CatalogSyncJob'
  )
ORDER BY table_name;

\echo '=== new columns on legacy tables ==='
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'FavoriteDrama' AND column_name = 'seriesId') OR
    (table_name = 'SavedEpisode' AND column_name = 'seriesId') OR
    (table_name = 'WatchHistory' AND column_name = 'seriesId') OR
    (table_name = 'DramaChannelBroadcast' AND column_name = 'seriesId')
  )
ORDER BY table_name, column_name;

\echo '=== new foreign keys ==='
SELECT conname, convalidated
FROM pg_constraint
WHERE conname IN (
  'FavoriteDrama_seriesId_fkey',
  'SavedEpisode_seriesId_fkey',
  'WatchHistory_seriesId_fkey',
  'DramaChannelBroadcast_seriesId_fkey'
)
ORDER BY conname;

\echo '=== legacy app counts ==='
SELECT
  (SELECT COUNT(*) FROM "User") AS users,
  (SELECT COUNT(*) FROM "VipPayment") AS vip_payments,
  (SELECT COUNT(*) FROM "Drama") AS dramas,
  (SELECT COUNT(*) FROM "FavoriteDrama") AS favorite_dramas,
  (SELECT COUNT(*) FROM "SavedEpisode") AS saved_episodes,
  (SELECT COUNT(*) FROM "WatchHistory") AS watch_history;

\echo '=== additive schema counts ==='
SELECT
  (SELECT COUNT(*) FROM "CatalogPlatform") AS catalog_platforms,
  (SELECT COUNT(*) FROM "CatalogLanguage") AS catalog_languages,
  (SELECT COUNT(*) FROM "CatalogSeries") AS catalog_series,
  (SELECT COUNT(*) FROM "CatalogEpisode") AS catalog_episodes,
  (SELECT COUNT(*) FROM "CatalogSyncJob") AS catalog_sync_jobs;
