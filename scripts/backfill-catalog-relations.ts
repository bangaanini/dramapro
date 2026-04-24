import { Client } from "pg";

type CountsRow = {
  catalog_series: string;
  catalog_languages: string;
  dramas: string;
  favorites_total: string;
  favorites_pending: string;
  saved_total: string;
  saved_pending: string;
  history_total: string;
  history_pending: string;
  broadcasts_total: string;
  broadcasts_pending: string;
};

type MappingSummaryRow = {
  mapped_dramas: string;
  unmapped_dramas: string;
  favorite_mappable: string;
  saved_mappable: string;
  history_mappable: string;
  broadcast_mappable: string;
  favorite_conflicts: string;
  saved_conflicts: string;
  history_conflicts: string;
};

type ApplySummaryRow = {
  favorites_updated: string;
  saved_updated: string;
  history_updated: string;
  broadcasts_updated: string;
};

const DATABASE_ENV_PRIORITY = [
  "BACKFILL_DATABASE_URL",
  "PROD_DIRECT_URL",
  "DIRECT_URL",
  "DATABASE_URL",
] as const;

function resolveDatabaseUrl() {
  for (const key of DATABASE_ENV_PRIORITY) {
    const value = process.env[key]?.trim();
    if (value) {
      return { key, value };
    }
  }

  throw new Error(
    `Database URL tidak ditemukan. Set salah satu env ini: ${DATABASE_ENV_PRIORITY.join(", ")}`,
  );
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function toNumber(value: string) {
  return Number.parseInt(value, 10);
}

function formatCounts(row: CountsRow) {
  return {
    catalogSeries: toNumber(row.catalog_series),
    catalogLanguages: toNumber(row.catalog_languages),
    dramas: toNumber(row.dramas),
    favorites: {
      total: toNumber(row.favorites_total),
      pending: toNumber(row.favorites_pending),
    },
    savedEpisodes: {
      total: toNumber(row.saved_total),
      pending: toNumber(row.saved_pending),
    },
    watchHistory: {
      total: toNumber(row.history_total),
      pending: toNumber(row.history_pending),
    },
    broadcasts: {
      total: toNumber(row.broadcasts_total),
      pending: toNumber(row.broadcasts_pending),
    },
  };
}

function formatMappingSummary(row: MappingSummaryRow) {
  return {
    mappedDramas: toNumber(row.mapped_dramas),
    unmappedDramas: toNumber(row.unmapped_dramas),
    mappableRows: {
      favorites: toNumber(row.favorite_mappable),
      savedEpisodes: toNumber(row.saved_mappable),
      watchHistory: toNumber(row.history_mappable),
      broadcasts: toNumber(row.broadcast_mappable),
    },
    conflicts: {
      favorites: toNumber(row.favorite_conflicts),
      savedEpisodes: toNumber(row.saved_conflicts),
      watchHistory: toNumber(row.history_conflicts),
    },
  };
}

function formatApplySummary(row: ApplySummaryRow) {
  return {
    favoritesUpdated: toNumber(row.favorites_updated),
    savedEpisodesUpdated: toNumber(row.saved_updated),
    watchHistoryUpdated: toNumber(row.history_updated),
    broadcastsUpdated: toNumber(row.broadcasts_updated),
  };
}

const MAPPING_CTE = `
WITH ranked_catalog AS (
  SELECT
    cs."id" AS "seriesId",
    cs."platformId" AS "platformId",
    cs."upstreamSeriesId" AS "upstreamSeriesId",
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(cs."title", '\\[[^]]*\\]', '', 'g'),
            '\\([^)]*\\)',
            '',
            'g'
          ),
          '(sulih\\s*suara|dubbing)',
          '',
          'gi'
        ),
        '[^[:alnum:]]+',
        '',
        'g'
      )
    ) AS "normalizedTitle",
    cl."code" AS "languageCode",
    ROW_NUMBER() OVER (
      PARTITION BY cs."platformId", cs."upstreamSeriesId"
      ORDER BY
        cl."isDefault" DESC,
        CASE WHEN cl."code" = 'id' THEN 1 ELSE 0 END DESC,
        cl."updatedAt" DESC,
        cs."updatedAt" DESC,
        cs."id" ASC
    ) AS "rankNo"
  FROM "CatalogSeries" cs
  INNER JOIN "CatalogLanguage" cl
    ON cl."id" = cs."languageId"
  WHERE cl."isActive" = true
),
catalog_mapping AS (
  SELECT
    d."id" AS "dramaId",
    rc."seriesId" AS "seriesId"
  FROM "Drama" d
  INNER JOIN ranked_catalog rc
    ON rc."platformId" = d."providerName"::text
   AND rc."upstreamSeriesId" = d."providerDramaId"
   AND rc."rankNo" = 1

  UNION

  SELECT
    d."id" AS "dramaId",
    candidate."seriesId" AS "seriesId"
  FROM "Drama" d
  INNER JOIN (
    SELECT
      rc."seriesId",
      rc."platformId",
      rc."normalizedTitle"
    FROM ranked_catalog rc
    WHERE rc."rankNo" = 1
      AND rc."normalizedTitle" <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM ranked_catalog rc2
        WHERE rc2."rankNo" = 1
          AND rc2."platformId" = rc."platformId"
          AND rc2."normalizedTitle" = rc."normalizedTitle"
          AND rc2."seriesId" <> rc."seriesId"
      )
  ) candidate
    ON candidate."platformId" = d."providerName"::text
   AND candidate."normalizedTitle" = lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(d."title", '\\[[^]]*\\]', '', 'g'),
            '\\([^)]*\\)',
            '',
            'g'
          ),
          '(sulih\\s*suara|dubbing)',
          '',
          'gi'
        ),
        '[^[:alnum:]]+',
        '',
        'g'
      )
    )
  WHERE NOT EXISTS (
    SELECT 1
    FROM ranked_catalog direct_rc
    WHERE direct_rc."platformId" = d."providerName"::text
      AND direct_rc."upstreamSeriesId" = d."providerDramaId"
      AND direct_rc."rankNo" = 1
  )
)
`;

const COUNTS_SQL = `
SELECT
  (SELECT COUNT(*)::text FROM "CatalogSeries") AS catalog_series,
  (SELECT COUNT(*)::text FROM "CatalogLanguage") AS catalog_languages,
  (SELECT COUNT(*)::text FROM "Drama") AS dramas,
  (SELECT COUNT(*)::text FROM "FavoriteDrama") AS favorites_total,
  (SELECT COUNT(*)::text FROM "FavoriteDrama" WHERE "seriesId" IS NULL) AS favorites_pending,
  (SELECT COUNT(*)::text FROM "SavedEpisode") AS saved_total,
  (SELECT COUNT(*)::text FROM "SavedEpisode" WHERE "seriesId" IS NULL) AS saved_pending,
  (SELECT COUNT(*)::text FROM "WatchHistory") AS history_total,
  (SELECT COUNT(*)::text FROM "WatchHistory" WHERE "seriesId" IS NULL) AS history_pending,
  (SELECT COUNT(*)::text FROM "DramaChannelBroadcast") AS broadcasts_total,
  (SELECT COUNT(*)::text FROM "DramaChannelBroadcast" WHERE "seriesId" IS NULL) AS broadcasts_pending
`;

const SUMMARY_SQL = `
${MAPPING_CTE}
SELECT
  (SELECT COUNT(*)::text FROM catalog_mapping) AS mapped_dramas,
  (SELECT (SELECT COUNT(*) FROM "Drama") - COUNT(*) FROM catalog_mapping)::text AS unmapped_dramas,
  (
    SELECT COUNT(*)::text
    FROM "FavoriteDrama" f
    INNER JOIN catalog_mapping cm ON cm."dramaId" = f."dramaId"
    WHERE f."seriesId" IS NULL
  ) AS favorite_mappable,
  (
    SELECT COUNT(*)::text
    FROM "SavedEpisode" s
    INNER JOIN catalog_mapping cm ON cm."dramaId" = s."dramaId"
    WHERE s."seriesId" IS NULL
  ) AS saved_mappable,
  (
    SELECT COUNT(*)::text
    FROM "WatchHistory" w
    INNER JOIN catalog_mapping cm ON cm."dramaId" = w."dramaId"
    WHERE w."seriesId" IS NULL
  ) AS history_mappable,
  (
    SELECT COUNT(*)::text
    FROM "DramaChannelBroadcast" b
    INNER JOIN catalog_mapping cm ON cm."dramaId" = b."dramaId"
    WHERE b."seriesId" IS NULL
  ) AS broadcast_mappable,
  (
    SELECT COUNT(*)::text
    FROM "FavoriteDrama" f
    INNER JOIN catalog_mapping cm ON cm."dramaId" = f."dramaId"
    WHERE f."seriesId" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "FavoriteDrama" existing
        WHERE existing."userId" = f."userId"
          AND existing."seriesId" = cm."seriesId"
      )
  ) AS favorite_conflicts,
  (
    SELECT COUNT(*)::text
    FROM "SavedEpisode" s
    INNER JOIN catalog_mapping cm ON cm."dramaId" = s."dramaId"
    WHERE s."seriesId" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "SavedEpisode" existing
        WHERE existing."userId" = s."userId"
          AND existing."seriesId" = cm."seriesId"
          AND existing."episodeIndex" = s."episodeIndex"
      )
  ) AS saved_conflicts,
  (
    SELECT COUNT(*)::text
    FROM "WatchHistory" w
    INNER JOIN catalog_mapping cm ON cm."dramaId" = w."dramaId"
    WHERE w."seriesId" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "WatchHistory" existing
        WHERE existing."userId" = w."userId"
          AND existing."seriesId" = cm."seriesId"
      )
  ) AS history_conflicts
`;

const CREATE_TEMP_MAPPING_SQL = `
CREATE TEMP TABLE "tmp_catalog_backfill_mapping" ON COMMIT DROP AS
${MAPPING_CTE}
SELECT "dramaId", "seriesId"
FROM catalog_mapping;
`;

const CREATE_TEMP_MAPPING_INDEX_SQL = `
CREATE INDEX "tmp_catalog_backfill_mapping_drama_idx"
  ON "tmp_catalog_backfill_mapping" ("dramaId");
`;

const UPDATE_FAVORITES_SQL = `
WITH updated AS (
  UPDATE "FavoriteDrama" f
  SET "seriesId" = m."seriesId"
  FROM "tmp_catalog_backfill_mapping" m
  WHERE f."dramaId" = m."dramaId"
    AND f."seriesId" IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "FavoriteDrama" existing
      WHERE existing."userId" = f."userId"
        AND existing."seriesId" = m."seriesId"
    )
  RETURNING 1
)
SELECT COUNT(*)::text AS favorites_updated FROM updated;
`;

const UPDATE_SAVED_EPISODES_SQL = `
WITH updated AS (
  UPDATE "SavedEpisode" s
  SET "seriesId" = m."seriesId"
  FROM "tmp_catalog_backfill_mapping" m
  WHERE s."dramaId" = m."dramaId"
    AND s."seriesId" IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "SavedEpisode" existing
      WHERE existing."userId" = s."userId"
        AND existing."seriesId" = m."seriesId"
        AND existing."episodeIndex" = s."episodeIndex"
    )
  RETURNING 1
)
SELECT COUNT(*)::text AS saved_updated FROM updated;
`;

const UPDATE_WATCH_HISTORY_SQL = `
WITH updated AS (
  UPDATE "WatchHistory" w
  SET "seriesId" = m."seriesId"
  FROM "tmp_catalog_backfill_mapping" m
  WHERE w."dramaId" = m."dramaId"
    AND w."seriesId" IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "WatchHistory" existing
      WHERE existing."userId" = w."userId"
        AND existing."seriesId" = m."seriesId"
    )
  RETURNING 1
)
SELECT COUNT(*)::text AS history_updated FROM updated;
`;

const UPDATE_BROADCASTS_SQL = `
WITH updated AS (
  UPDATE "DramaChannelBroadcast" b
  SET "seriesId" = m."seriesId"
  FROM "tmp_catalog_backfill_mapping" m
  WHERE b."dramaId" = m."dramaId"
    AND b."seriesId" IS NULL
  RETURNING 1
)
SELECT COUNT(*)::text AS broadcasts_updated FROM updated;
`;

async function main() {
  const dryRun = !hasFlag("--apply");
  const envOverride = getArgValue("--database-url-env");
  const resolved = envOverride
    ? {
        key: envOverride,
        value: process.env[envOverride]?.trim() || "",
      }
    : resolveDatabaseUrl();

  if (!resolved.value) {
    throw new Error(`Env ${resolved.key} kosong atau tidak ditemukan.`);
  }

  const client = new Client({
    connectionString: resolved.value,
  });

  await client.connect();

  try {
    const countsResult = await client.query<CountsRow>(COUNTS_SQL);
    const summaryResult = await client.query<MappingSummaryRow>(SUMMARY_SQL);

    const counts = formatCounts(countsResult.rows[0]);
    const summary = formatMappingSummary(summaryResult.rows[0]);

    console.log(
      JSON.stringify(
        {
          mode: dryRun ? "dry-run" : "apply",
          databaseEnv: resolved.key,
          counts,
          summary,
        },
        null,
        2,
      ),
    );

    if (counts.catalogSeries === 0 || counts.catalogLanguages === 0) {
      console.error(
        "Catalog masih kosong. Jalankan sync katalog dulu sebelum backfill relation.",
      );
      process.exitCode = 2;
      return;
    }

    if (dryRun) {
      return;
    }

    let applySummary: ReturnType<typeof formatApplySummary>;

    try {
      await client.query("BEGIN");
      await client.query(CREATE_TEMP_MAPPING_SQL);
      await client.query(CREATE_TEMP_MAPPING_INDEX_SQL);

      const favoritesResult =
        await client.query<{ favorites_updated: string }>(UPDATE_FAVORITES_SQL);
      const savedEpisodesResult =
        await client.query<{ saved_updated: string }>(UPDATE_SAVED_EPISODES_SQL);
      const watchHistoryResult =
        await client.query<{ history_updated: string }>(UPDATE_WATCH_HISTORY_SQL);
      const broadcastsResult =
        await client.query<{ broadcasts_updated: string }>(UPDATE_BROADCASTS_SQL);

      await client.query("COMMIT");

      applySummary = formatApplySummary({
        favorites_updated:
          favoritesResult.rows[0]?.favorites_updated ?? "0",
        saved_updated: savedEpisodesResult.rows[0]?.saved_updated ?? "0",
        history_updated: watchHistoryResult.rows[0]?.history_updated ?? "0",
        broadcasts_updated:
          broadcastsResult.rows[0]?.broadcasts_updated ?? "0",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    const postCountsResult = await client.query<CountsRow>(COUNTS_SQL);
    const postSummaryResult = await client.query<MappingSummaryRow>(SUMMARY_SQL);

    console.log(
      JSON.stringify(
        {
          mode: "apply",
          databaseEnv: resolved.key,
          updated: applySummary,
          after: {
            counts: formatCounts(postCountsResult.rows[0]),
            summary: formatMappingSummary(postSummaryResult.rows[0]),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
