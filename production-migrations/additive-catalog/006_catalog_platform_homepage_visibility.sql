SET lock_timeout = '5s';
SET statement_timeout = '0';

ALTER TABLE "CatalogPlatform"
  ADD COLUMN IF NOT EXISTS "isHomepageVisible" BOOLEAN NOT NULL DEFAULT true;
