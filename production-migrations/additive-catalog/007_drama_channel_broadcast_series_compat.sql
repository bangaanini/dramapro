SET lock_timeout = '5s';
SET statement_timeout = '0';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DramaChannelBroadcast'
      AND column_name = 'dramaId'
  ) THEN
    ALTER TABLE "DramaChannelBroadcast"
      ALTER COLUMN "dramaId" DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "DramaChannelBroadcast_seriesId_createdAt_idx"
  ON "DramaChannelBroadcast" ("seriesId", "createdAt")
  WHERE "seriesId" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DramaChannelBroadcast'
      AND column_name = 'seriesId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DramaChannelBroadcast_seriesId_fkey'
  ) THEN
    ALTER TABLE "DramaChannelBroadcast"
      ADD CONSTRAINT "DramaChannelBroadcast_seriesId_fkey"
      FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;
