-- CreateEnum
CREATE TYPE "ProviderHealthStatus" AS ENUM ('unknown', 'healthy', 'no_data', 'stream_error');

-- CreateTable
CREATE TABLE "ProviderRuntimeControl" (
    "providerName" "ProviderName" NOT NULL,
    "isHomepageVisible" BOOLEAN NOT NULL DEFAULT true,
    "healthStatus" "ProviderHealthStatus" NOT NULL DEFAULT 'unknown',
    "healthMessage" TEXT NOT NULL DEFAULT '',
    "checkedDramaId" TEXT NOT NULL DEFAULT '',
    "checkedDramaTitle" TEXT NOT NULL DEFAULT '',
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderRuntimeControl_pkey" PRIMARY KEY ("providerName")
);

-- CreateIndex
CREATE INDEX "ProviderRuntimeControl_isHomepageVisible_providerName_idx" ON "ProviderRuntimeControl"("isHomepageVisible", "providerName");
