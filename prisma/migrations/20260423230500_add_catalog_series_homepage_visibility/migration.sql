ALTER TABLE "CatalogSeries"
ADD COLUMN "isHomepageVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "homepageHiddenReason" TEXT;

CREATE INDEX "CatalogSeries_isHomepageVisible_updatedAt_idx"
ON "CatalogSeries"("isHomepageVisible", "updatedAt");
