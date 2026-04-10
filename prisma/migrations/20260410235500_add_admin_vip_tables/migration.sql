CREATE TABLE "VipSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lockFromEpisode" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VipPricePlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "durationDays" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipPricePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VipPricePlan_slug_key" ON "VipPricePlan"("slug");
CREATE INDEX "VipPricePlan_isActive_sortOrder_idx" ON "VipPricePlan"("isActive", "sortOrder");
