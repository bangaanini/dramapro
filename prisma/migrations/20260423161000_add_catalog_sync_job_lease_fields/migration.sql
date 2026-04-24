ALTER TABLE "CatalogSyncJob"
ADD COLUMN "runnerId" TEXT,
ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3);

CREATE INDEX "CatalogSyncJob_status_leaseExpiresAt_idx"
ON "CatalogSyncJob"("status", "leaseExpiresAt");
