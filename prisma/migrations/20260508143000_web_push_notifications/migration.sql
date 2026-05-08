DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushNotificationType') THEN
    CREATE TYPE "PushNotificationType" AS ENUM ('custom', 'drama', 'episode', 'vip');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushNotificationAudience') THEN
    CREATE TYPE "PushNotificationAudience" AS ENUM ('all', 'guest', 'users', 'vip', 'non_vip', 'partner_bot', 'specific_users');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushNotificationStatus') THEN
    CREATE TYPE "PushNotificationStatus" AS ENUM ('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PushNotificationDeliveryStatus') THEN
    CREATE TYPE "PushNotificationDeliveryStatus" AS ENUM ('queued', 'sent', 'failed', 'skipped');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userId" UUID,
  "userAgent" TEXT NOT NULL DEFAULT '',
  "deviceLabel" TEXT NOT NULL DEFAULT '',
  "browserName" TEXT NOT NULL DEFAULT '',
  "platformName" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PushNotificationCampaign" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "PushNotificationType" NOT NULL DEFAULT 'custom',
  "audience" "PushNotificationAudience" NOT NULL DEFAULT 'all',
  "status" "PushNotificationStatus" NOT NULL DEFAULT 'draft',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL DEFAULT '',
  "targetUrl" TEXT NOT NULL DEFAULT '/',
  "targetPayload" JSONB,
  "totalTargets" INTEGER NOT NULL DEFAULT 0,
  "queuedCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT NOT NULL DEFAULT '',
  "createdByAdminUserId" UUID,
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PushNotificationDelivery" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaignId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "userId" UUID,
  "status" "PushNotificationDeliveryStatus" NOT NULL DEFAULT 'queued',
  "error" TEXT NOT NULL DEFAULT '',
  "attemptedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
  ON "PushSubscription"("endpoint");

CREATE INDEX IF NOT EXISTS "PushSubscription_userId_isActive_idx"
  ON "PushSubscription"("userId", "isActive");

CREATE INDEX IF NOT EXISTS "PushSubscription_isActive_updatedAt_idx"
  ON "PushSubscription"("isActive", "updatedAt");

CREATE INDEX IF NOT EXISTS "PushNotificationCampaign_status_createdAt_idx"
  ON "PushNotificationCampaign"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "PushNotificationCampaign_audience_createdAt_idx"
  ON "PushNotificationCampaign"("audience", "createdAt");

CREATE INDEX IF NOT EXISTS "PushNotificationCampaign_createdByAdminUserId_createdAt_idx"
  ON "PushNotificationCampaign"("createdByAdminUserId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PushNotificationDelivery_campaignId_subscriptionId_key"
  ON "PushNotificationDelivery"("campaignId", "subscriptionId");

CREATE INDEX IF NOT EXISTS "PushNotificationDelivery_status_createdAt_idx"
  ON "PushNotificationDelivery"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "PushNotificationDelivery_subscriptionId_status_idx"
  ON "PushNotificationDelivery"("subscriptionId", "status");

CREATE INDEX IF NOT EXISTS "PushNotificationDelivery_userId_createdAt_idx"
  ON "PushNotificationDelivery"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_userId_fkey') THEN
    ALTER TABLE "PushSubscription"
      ADD CONSTRAINT "PushSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushNotificationCampaign_createdByAdminUserId_fkey') THEN
    ALTER TABLE "PushNotificationCampaign"
      ADD CONSTRAINT "PushNotificationCampaign_createdByAdminUserId_fkey"
      FOREIGN KEY ("createdByAdminUserId") REFERENCES "AdminUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushNotificationDelivery_campaignId_fkey') THEN
    ALTER TABLE "PushNotificationDelivery"
      ADD CONSTRAINT "PushNotificationDelivery_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "PushNotificationCampaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushNotificationDelivery_subscriptionId_fkey') THEN
    ALTER TABLE "PushNotificationDelivery"
      ADD CONSTRAINT "PushNotificationDelivery_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushNotificationDelivery_userId_fkey') THEN
    ALTER TABLE "PushNotificationDelivery"
      ADD CONSTRAINT "PushNotificationDelivery_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
