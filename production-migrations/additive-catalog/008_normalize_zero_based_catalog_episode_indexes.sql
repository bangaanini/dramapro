SET lock_timeout = '5s';
SET statement_timeout = '0';

CREATE TEMP TABLE "_zero_based_catalog_series" AS
SELECT s.id
FROM "CatalogSeries" s
JOIN "CatalogEpisode" e
  ON e."seriesId" = s.id
GROUP BY s.id
HAVING MIN(e."episodeIndex") = 0;

UPDATE "CatalogEpisode" e
SET "episodeIndex" = -(e."episodeIndex" + 1)
FROM "_zero_based_catalog_series" z
WHERE e."seriesId" = z.id;

UPDATE "CatalogEpisode" e
SET "episodeIndex" = -e."episodeIndex"
FROM "_zero_based_catalog_series" z
WHERE e."seriesId" = z.id
  AND e."episodeIndex" < 0;

UPDATE "SavedEpisode" se
SET "episodeIndex" = se."episodeIndex" + 1
FROM "_zero_based_catalog_series" z
WHERE se."seriesId" = z.id
  AND se."episodeIndex" >= 0;

UPDATE "WatchHistory" wh
SET "episodeIndex" = wh."episodeIndex" + 1
FROM "_zero_based_catalog_series" z
WHERE wh."seriesId" = z.id
  AND wh."episodeIndex" >= 0;

SELECT COUNT(*) AS normalized_zero_based_series
FROM "_zero_based_catalog_series";
