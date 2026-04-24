-- CreateEnum
CREATE TYPE "ProviderName" AS ENUM ('melolo', 'meloshort', 'goodshort', 'dramawave', 'reelshort', 'freereels', 'flickreels', 'netshort');

-- CreateTable
CREATE TABLE "Drama" (
    "id" UUID NOT NULL,
    "providerDramaId" TEXT NOT NULL,
    "providerName" "ProviderName" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "thumbUrl" TEXT NOT NULL DEFAULT '',
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "watchValue" TEXT NOT NULL DEFAULT '',
    "isNewBook" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drama_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Drama_providerName_updatedAt_idx" ON "Drama"("providerName", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Drama_providerName_providerDramaId_key" ON "Drama"("providerName", "providerDramaId");
