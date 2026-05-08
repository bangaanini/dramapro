ALTER TABLE "AppSettings"
  ADD COLUMN IF NOT EXISTS "telegramAdminIds" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "telegramAdminUsernames" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "AnalyticsVisitor" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID,
    "firstSource" TEXT NOT NULL DEFAULT 'web',
    "lastSource" TEXT NOT NULL DEFAULT 'web',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsVisitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalyticsSession" (
    "id" UUID NOT NULL,
    "visitorId" UUID NOT NULL,
    "userId" UUID,
    "partnerBotId" UUID,
    "source" TEXT NOT NULL DEFAULT 'web',
    "deviceType" TEXT NOT NULL DEFAULT 'unknown',
    "osName" TEXT NOT NULL DEFAULT 'unknown',
    "browserName" TEXT NOT NULL DEFAULT 'unknown',
    "countryCode" TEXT NOT NULL DEFAULT 'unknown',
    "pageViewCount" INTEGER NOT NULL DEFAULT 0,
    "videoPlayCount" INTEGER NOT NULL DEFAULT 0,
    "heartbeatCount" INTEGER NOT NULL DEFAULT 0,
    "isReturning" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" UUID NOT NULL,
    "dedupeKey" TEXT,
    "visitorId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "userId" UUID,
    "partnerBotId" UUID,
    "seriesId" UUID,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "path" TEXT NOT NULL DEFAULT '',
    "episodeIndex" INTEGER,
    "meta" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsVisitor_tokenHash_key" ON "AnalyticsVisitor"("tokenHash");
CREATE INDEX IF NOT EXISTS "AnalyticsVisitor_userId_lastSeenAt_idx" ON "AnalyticsVisitor"("userId", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "AnalyticsVisitor_firstSeenAt_idx" ON "AnalyticsVisitor"("firstSeenAt");
CREATE INDEX IF NOT EXISTS "AnalyticsVisitor_lastSeenAt_idx" ON "AnalyticsVisitor"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "AnalyticsVisitor_firstSource_firstSeenAt_idx" ON "AnalyticsVisitor"("firstSource", "firstSeenAt");

CREATE INDEX IF NOT EXISTS "AnalyticsSession_visitorId_lastSeenAt_idx" ON "AnalyticsSession"("visitorId", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_userId_startedAt_idx" ON "AnalyticsSession"("userId", "startedAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_partnerBotId_startedAt_idx" ON "AnalyticsSession"("partnerBotId", "startedAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_partnerBotId_lastSeenAt_idx" ON "AnalyticsSession"("partnerBotId", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_lastSeenAt_idx" ON "AnalyticsSession"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_startedAt_idx" ON "AnalyticsSession"("startedAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_source_startedAt_idx" ON "AnalyticsSession"("source", "startedAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_deviceType_startedAt_idx" ON "AnalyticsSession"("deviceType", "startedAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_osName_startedAt_idx" ON "AnalyticsSession"("osName", "startedAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_browserName_startedAt_idx" ON "AnalyticsSession"("browserName", "startedAt");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_countryCode_startedAt_idx" ON "AnalyticsSession"("countryCode", "startedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsEvent_dedupeKey_key" ON "AnalyticsEvent"("dedupeKey");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_type_occurredAt_idx" ON "AnalyticsEvent"("type", "occurredAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_source_occurredAt_idx" ON "AnalyticsEvent"("source", "occurredAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_occurredAt_idx" ON "AnalyticsEvent"("sessionId", "occurredAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_visitorId_occurredAt_idx" ON "AnalyticsEvent"("visitorId", "occurredAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_seriesId_occurredAt_idx" ON "AnalyticsEvent"("seriesId", "occurredAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_partnerBotId_occurredAt_idx" ON "AnalyticsEvent"("partnerBotId", "occurredAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_partnerBotId_type_occurredAt_idx" ON "AnalyticsEvent"("partnerBotId", "type", "occurredAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsVisitor_userId_fkey') THEN
    ALTER TABLE "AnalyticsVisitor"
      ADD CONSTRAINT "AnalyticsVisitor_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsSession_visitorId_fkey') THEN
    ALTER TABLE "AnalyticsSession"
      ADD CONSTRAINT "AnalyticsSession_visitorId_fkey"
      FOREIGN KEY ("visitorId") REFERENCES "AnalyticsVisitor"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsSession_userId_fkey') THEN
    ALTER TABLE "AnalyticsSession"
      ADD CONSTRAINT "AnalyticsSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsSession_partnerBotId_fkey') THEN
    ALTER TABLE "AnalyticsSession"
      ADD CONSTRAINT "AnalyticsSession_partnerBotId_fkey"
      FOREIGN KEY ("partnerBotId") REFERENCES "TelegramPartnerBot"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_visitorId_fkey') THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_visitorId_fkey"
      FOREIGN KEY ("visitorId") REFERENCES "AnalyticsVisitor"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_sessionId_fkey') THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_userId_fkey') THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_partnerBotId_fkey') THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_partnerBotId_fkey"
      FOREIGN KEY ("partnerBotId") REFERENCES "TelegramPartnerBot"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_seriesId_fkey') THEN
    ALTER TABLE "AnalyticsEvent"
      ADD CONSTRAINT "AnalyticsEvent_seriesId_fkey"
      FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "AffiliateWithdrawal"
  ADD COLUMN IF NOT EXISTS "partnerBotId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AffiliateWithdrawal_partnerBotId_fkey') THEN
    ALTER TABLE "AffiliateWithdrawal"
      ADD CONSTRAINT "AffiliateWithdrawal_partnerBotId_fkey"
      FOREIGN KEY ("partnerBotId") REFERENCES "TelegramPartnerBot"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AffiliateWithdrawal_partnerBotId_status_createdAt_idx"
  ON "AffiliateWithdrawal"("partnerBotId", "status", "createdAt");

WITH single_owner_bot AS (
  SELECT
    "ownerUserId",
    (ARRAY_AGG("id" ORDER BY "createdAt" ASC, "id"::text ASC))[1] AS "partnerBotId"
  FROM "TelegramPartnerBot"
  GROUP BY "ownerUserId"
  HAVING COUNT(*) = 1
)
UPDATE "AffiliateWithdrawal" aw
SET "partnerBotId" = sob."partnerBotId"
FROM single_owner_bot sob
WHERE aw."affiliateUserId" = sob."ownerUserId"
  AND aw."partnerBotId" IS NULL;
