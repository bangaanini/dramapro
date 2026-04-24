-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CatalogSyncScope" AS ENUM ('tab', 'series');

-- CreateEnum
CREATE TYPE "CatalogSyncStatus" AS ENUM ('pending', 'synced', 'failed');

-- CreateEnum
CREATE TYPE "VipPaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('paymenku', 'xendit', 'midtrans', 'tripay', 'doku');

-- CreateEnum
CREATE TYPE "UserAuthProvider" AS ENUM ('local', 'telegram');

-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('approved', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "AffiliateWithdrawalStatus" AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- CreateTable
CREATE TABLE "CatalogPlatform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogLanguage" (
    "id" UUID NOT NULL,
    "platformId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "upstreamCode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogTab" (
    "id" UUID NOT NULL,
    "platformId" TEXT NOT NULL,
    "languageId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tabKey" TEXT NOT NULL,
    "positionIndex" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogTab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogSeries" (
    "id" UUID NOT NULL,
    "platformId" TEXT NOT NULL,
    "languageId" UUID NOT NULL,
    "upstreamSeriesId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "playCount" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastDetailSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogTabSeries" (
    "id" UUID NOT NULL,
    "tabId" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "sourcePageNo" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogTabSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogEpisode" (
    "id" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "episodeIndex" INTEGER NOT NULL,
    "episodeLabel" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL,
    "quality" INTEGER,
    "subtitles" JSONB,
    "checksum" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogSyncState" (
    "id" UUID NOT NULL,
    "scope" "CatalogSyncScope" NOT NULL,
    "status" "CatalogSyncStatus" NOT NULL DEFAULT 'pending',
    "tabId" UUID,
    "seriesId" UUID,
    "lastPageInfo" JSONB,
    "hasMore" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "adminUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "authProvider" "UserAuthProvider" NOT NULL DEFAULT 'local',
    "passwordHash" TEXT,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "telegramPhotoUrl" TEXT,
    "telegramFirstName" TEXT,
    "telegramLastName" TEXT,
    "telegramLanguageCode" TEXT,
    "vipStartedAt" TIMESTAMP(3),
    "vipExpiresAt" TIMESTAMP(3),
    "affiliateCode" TEXT,
    "affiliateCommissionOverrideRate" INTEGER,
    "referredById" UUID,
    "referredByPartnerBotId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteDrama" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteDrama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedEpisode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "episodeIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "episodeIndex" INTEGER NOT NULL DEFAULT 1,
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VipSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lockFromEpisode" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VipPricePlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "badgeText" TEXT NOT NULL DEFAULT '',
    "badgeColor" TEXT NOT NULL DEFAULT '',
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "durationDays" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipPricePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewaySettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "activeProvider" "PaymentGatewayProvider",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "telegramBotUsername" TEXT NOT NULL DEFAULT '',
    "telegramBotTokenCiphertext" TEXT,
    "telegramWebhookSecretCiphertext" TEXT,
    "telegramSupportUrl" TEXT NOT NULL DEFAULT '',
    "telegramMiniAppUrl" TEXT NOT NULL DEFAULT '',
    "telegramDefaultBroadcastChannel" TEXT NOT NULL DEFAULT '',
    "telegramBoxOfficeBotUrl" TEXT NOT NULL DEFAULT '',
    "telegramInlineButtons" JSONB,
    "telegramWelcomeMessage" TEXT NOT NULL DEFAULT '',
    "telegramOpenButtonText" TEXT NOT NULL DEFAULT '',
    "telegramOpenButtonUrl" TEXT NOT NULL DEFAULT '',
    "telegramSearchButtonText" TEXT NOT NULL DEFAULT '',
    "telegramSearchButtonUrl" TEXT NOT NULL DEFAULT '',
    "telegramAffiliateButtonText" TEXT NOT NULL DEFAULT '',
    "telegramAffiliateButtonUrl" TEXT NOT NULL DEFAULT '',
    "telegramDramaChannelButtonText" TEXT NOT NULL DEFAULT '',
    "telegramDramaChannelUrl" TEXT NOT NULL DEFAULT '',
    "telegramMovieChannelButtonText" TEXT NOT NULL DEFAULT '',
    "telegramMovieChannelUrl" TEXT NOT NULL DEFAULT '',
    "telegramSupportButtonText" TEXT NOT NULL DEFAULT '',
    "telegramSupportButtonUrl" TEXT NOT NULL DEFAULT '',
    "telegramVipButtonText" TEXT NOT NULL DEFAULT '',
    "telegramVipButtonUrl" TEXT NOT NULL DEFAULT '',
    "siteUrl" TEXT NOT NULL DEFAULT '',
    "siteName" TEXT NOT NULL DEFAULT '',
    "siteDescription" TEXT NOT NULL DEFAULT '',
    "siteLogoUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramPartnerBot" (
    "id" UUID NOT NULL,
    "botUsername" TEXT NOT NULL,
    "botTokenCiphertext" TEXT NOT NULL,
    "webhookSecretCiphertext" TEXT,
    "defaultChannelUsername" TEXT NOT NULL DEFAULT '',
    "boxOfficeBotUrl" TEXT NOT NULL DEFAULT '',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "inlineButtons" JSONB,
    "ownerUserId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramPartnerBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DramaChannelBroadcast" (
    "id" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "ownerUserId" UUID,
    "partnerBotId" UUID,
    "botKind" TEXT NOT NULL DEFAULT 'default',
    "botUsername" TEXT NOT NULL,
    "channelUsername" TEXT NOT NULL,
    "buttonLabel" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "telegramMessageId" INTEGER,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DramaChannelBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" UUID NOT NULL,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultChannelCode" TEXT NOT NULL DEFAULT 'qris',
    "merchantId" TEXT NOT NULL DEFAULT '',
    "clientKey" TEXT NOT NULL DEFAULT '',
    "secretCiphertext" TEXT,
    "configJson" JSONB,
    "lastError" TEXT NOT NULL DEFAULT '',
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VipPayment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "vipPricePlanId" UUID NOT NULL,
    "referenceId" TEXT NOT NULL,
    "gatewayProvider" "PaymentGatewayProvider" NOT NULL DEFAULT 'paymenku',
    "providerTransactionId" TEXT,
    "channelCode" TEXT NOT NULL,
    "channelName" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "paidAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "VipPaymentStatus" NOT NULL DEFAULT 'pending',
    "payUrl" TEXT NOT NULL,
    "qrUrl" TEXT,
    "qrString" TEXT,
    "returnUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "providerPayload" JSONB,
    "statusPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cookieTtlDays" INTEGER NOT NULL DEFAULT 30,
    "minimumWithdrawalAmount" INTEGER NOT NULL DEFAULT 10000,
    "bronzeMinActiveReferrals" INTEGER NOT NULL DEFAULT 0,
    "bronzeCommissionRate" INTEGER NOT NULL DEFAULT 10,
    "silverMinActiveReferrals" INTEGER NOT NULL DEFAULT 5,
    "silverCommissionRate" INTEGER NOT NULL DEFAULT 15,
    "goldMinActiveReferrals" INTEGER NOT NULL DEFAULT 20,
    "goldCommissionRate" INTEGER NOT NULL DEFAULT 20,
    "platinumMinActiveReferrals" INTEGER NOT NULL DEFAULT 50,
    "platinumCommissionRate" INTEGER NOT NULL DEFAULT 25,
    "commissionNotes" TEXT NOT NULL DEFAULT '',
    "withdrawalNotes" TEXT NOT NULL DEFAULT '',
    "otherTerms" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateCommission" (
    "id" UUID NOT NULL,
    "affiliateUserId" UUID NOT NULL,
    "referredUserId" UUID NOT NULL,
    "vipPaymentId" UUID NOT NULL,
    "partnerBotId" UUID,
    "baseAmount" INTEGER NOT NULL,
    "commissionRate" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'approved',
    "description" TEXT NOT NULL DEFAULT '',
    "notificationSentAt" TIMESTAMP(3),
    "notificationError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateWithdrawal" (
    "id" UUID NOT NULL,
    "affiliateUserId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AffiliateWithdrawalStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "payoutAccountHolderName" TEXT NOT NULL DEFAULT '',
    "payoutBankName" TEXT NOT NULL DEFAULT '',
    "payoutAccountNumber" TEXT NOT NULL DEFAULT '',
    "payoutWhatsappNumber" TEXT NOT NULL DEFAULT '',
    "payoutEmail" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePayoutProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "payoutEmail" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogLanguage_platformId_isActive_idx" ON "CatalogLanguage"("platformId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogLanguage_platformId_code_key" ON "CatalogLanguage"("platformId", "code");

-- CreateIndex
CREATE INDEX "CatalogTab_platformId_languageId_isActive_idx" ON "CatalogTab"("platformId", "languageId", "isActive");

-- CreateIndex
CREATE INDEX "CatalogTab_type_sortOrder_idx" ON "CatalogTab"("type", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogTab_languageId_type_positionIndex_sortOrder_key" ON "CatalogTab"("languageId", "type", "positionIndex", "sortOrder");

-- CreateIndex
CREATE INDEX "CatalogSeries_platformId_languageId_updatedAt_idx" ON "CatalogSeries"("platformId", "languageId", "updatedAt");

-- CreateIndex
CREATE INDEX "CatalogSeries_title_updatedAt_idx" ON "CatalogSeries"("title", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSeries_platformId_languageId_upstreamSeriesId_key" ON "CatalogSeries"("platformId", "languageId", "upstreamSeriesId");

-- CreateIndex
CREATE INDEX "CatalogTabSeries_tabId_rank_idx" ON "CatalogTabSeries"("tabId", "rank");

-- CreateIndex
CREATE INDEX "CatalogTabSeries_seriesId_updatedAt_idx" ON "CatalogTabSeries"("seriesId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogTabSeries_tabId_seriesId_key" ON "CatalogTabSeries"("tabId", "seriesId");

-- CreateIndex
CREATE INDEX "CatalogEpisode_seriesId_updatedAt_idx" ON "CatalogEpisode"("seriesId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogEpisode_seriesId_episodeIndex_key" ON "CatalogEpisode"("seriesId", "episodeIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSyncState_tabId_key" ON "CatalogSyncState"("tabId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSyncState_seriesId_key" ON "CatalogSyncState"("seriesId");

-- CreateIndex
CREATE INDEX "CatalogSyncState_scope_status_updatedAt_idx" ON "CatalogSyncState"("scope", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_expiresAt_idx" ON "AdminSession"("adminUserId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_affiliateCode_key" ON "User"("affiliateCode");

-- CreateIndex
CREATE INDEX "User_referredById_createdAt_idx" ON "User"("referredById", "createdAt");

-- CreateIndex
CREATE INDEX "User_referredByPartnerBotId_createdAt_idx" ON "User"("referredByPartnerBotId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "FavoriteDrama_userId_createdAt_idx" ON "FavoriteDrama"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteDrama_userId_seriesId_key" ON "FavoriteDrama"("userId", "seriesId");

-- CreateIndex
CREATE INDEX "SavedEpisode_userId_updatedAt_idx" ON "SavedEpisode"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SavedEpisode_seriesId_updatedAt_idx" ON "SavedEpisode"("seriesId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedEpisode_userId_seriesId_episodeIndex_key" ON "SavedEpisode"("userId", "seriesId", "episodeIndex");

-- CreateIndex
CREATE INDEX "WatchHistory_userId_updatedAt_idx" ON "WatchHistory"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "WatchHistory_seriesId_updatedAt_idx" ON "WatchHistory"("seriesId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchHistory_userId_seriesId_key" ON "WatchHistory"("userId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "VipPricePlan_slug_key" ON "VipPricePlan"("slug");

-- CreateIndex
CREATE INDEX "VipPricePlan_isActive_sortOrder_idx" ON "VipPricePlan"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPartnerBot_botUsername_key" ON "TelegramPartnerBot"("botUsername");

-- CreateIndex
CREATE INDEX "TelegramPartnerBot_ownerUserId_isEnabled_idx" ON "TelegramPartnerBot"("ownerUserId", "isEnabled");

-- CreateIndex
CREATE INDEX "DramaChannelBroadcast_seriesId_createdAt_idx" ON "DramaChannelBroadcast"("seriesId", "createdAt");

-- CreateIndex
CREATE INDEX "DramaChannelBroadcast_ownerUserId_createdAt_idx" ON "DramaChannelBroadcast"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "DramaChannelBroadcast_partnerBotId_createdAt_idx" ON "DramaChannelBroadcast"("partnerBotId", "createdAt");

-- CreateIndex
CREATE INDEX "DramaChannelBroadcast_botKind_createdAt_idx" ON "DramaChannelBroadcast"("botKind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "VipPayment_referenceId_key" ON "VipPayment"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "VipPayment_providerTransactionId_key" ON "VipPayment"("providerTransactionId");

-- CreateIndex
CREATE INDEX "VipPayment_userId_status_createdAt_idx" ON "VipPayment"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "VipPayment_vipPricePlanId_createdAt_idx" ON "VipPayment"("vipPricePlanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCommission_vipPaymentId_key" ON "AffiliateCommission"("vipPaymentId");

-- CreateIndex
CREATE INDEX "AffiliateCommission_affiliateUserId_status_createdAt_idx" ON "AffiliateCommission"("affiliateUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateCommission_referredUserId_createdAt_idx" ON "AffiliateCommission"("referredUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateCommission_partnerBotId_createdAt_idx" ON "AffiliateCommission"("partnerBotId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateWithdrawal_affiliateUserId_status_createdAt_idx" ON "AffiliateWithdrawal"("affiliateUserId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliatePayoutProfile_userId_key" ON "AffiliatePayoutProfile"("userId");

-- AddForeignKey
ALTER TABLE "CatalogLanguage" ADD CONSTRAINT "CatalogLanguage_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "CatalogPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogTab" ADD CONSTRAINT "CatalogTab_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "CatalogPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogTab" ADD CONSTRAINT "CatalogTab_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "CatalogLanguage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogSeries" ADD CONSTRAINT "CatalogSeries_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "CatalogPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogSeries" ADD CONSTRAINT "CatalogSeries_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "CatalogLanguage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogTabSeries" ADD CONSTRAINT "CatalogTabSeries_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "CatalogTab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogTabSeries" ADD CONSTRAINT "CatalogTabSeries_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogEpisode" ADD CONSTRAINT "CatalogEpisode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogSyncState" ADD CONSTRAINT "CatalogSyncState_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "CatalogTab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogSyncState" ADD CONSTRAINT "CatalogSyncState_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByPartnerBotId_fkey" FOREIGN KEY ("referredByPartnerBotId") REFERENCES "TelegramPartnerBot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteDrama" ADD CONSTRAINT "FavoriteDrama_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteDrama" ADD CONSTRAINT "FavoriteDrama_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedEpisode" ADD CONSTRAINT "SavedEpisode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedEpisode" ADD CONSTRAINT "SavedEpisode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramPartnerBot" ADD CONSTRAINT "TelegramPartnerBot_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DramaChannelBroadcast" ADD CONSTRAINT "DramaChannelBroadcast_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DramaChannelBroadcast" ADD CONSTRAINT "DramaChannelBroadcast_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DramaChannelBroadcast" ADD CONSTRAINT "DramaChannelBroadcast_partnerBotId_fkey" FOREIGN KEY ("partnerBotId") REFERENCES "TelegramPartnerBot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VipPayment" ADD CONSTRAINT "VipPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VipPayment" ADD CONSTRAINT "VipPayment_vipPricePlanId_fkey" FOREIGN KEY ("vipPricePlanId") REFERENCES "VipPricePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_affiliateUserId_fkey" FOREIGN KEY ("affiliateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_vipPaymentId_fkey" FOREIGN KEY ("vipPaymentId") REFERENCES "VipPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_partnerBotId_fkey" FOREIGN KEY ("partnerBotId") REFERENCES "TelegramPartnerBot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateWithdrawal" ADD CONSTRAINT "AffiliateWithdrawal_affiliateUserId_fkey" FOREIGN KEY ("affiliateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePayoutProfile" ADD CONSTRAINT "AffiliatePayoutProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

