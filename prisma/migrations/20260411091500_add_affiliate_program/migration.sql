CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('approved', 'paid', 'cancelled');
CREATE TYPE "AffiliateWithdrawalStatus" AS ENUM ('pending', 'approved', 'rejected', 'paid');

ALTER TABLE "User"
ADD COLUMN "affiliateCode" TEXT,
ADD COLUMN "referredById" UUID;

CREATE UNIQUE INDEX "User_affiliateCode_key" ON "User"("affiliateCode");
CREATE INDEX "User_referredById_createdAt_idx" ON "User"("referredById", "createdAt");

ALTER TABLE "User"
ADD CONSTRAINT "User_referredById_fkey"
FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

CREATE TABLE "AffiliateCommission" (
    "id" UUID NOT NULL,
    "affiliateUserId" UUID NOT NULL,
    "referredUserId" UUID NOT NULL,
    "vipPaymentId" UUID NOT NULL,
    "baseAmount" INTEGER NOT NULL,
    "commissionRate" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'approved',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateWithdrawal" (
    "id" UUID NOT NULL,
    "affiliateUserId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AffiliateWithdrawalStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliateCommission_vipPaymentId_key" ON "AffiliateCommission"("vipPaymentId");
CREATE INDEX "AffiliateCommission_affiliateUserId_status_createdAt_idx" ON "AffiliateCommission"("affiliateUserId", "status", "createdAt");
CREATE INDEX "AffiliateCommission_referredUserId_createdAt_idx" ON "AffiliateCommission"("referredUserId", "createdAt");
CREATE INDEX "AffiliateWithdrawal_affiliateUserId_status_createdAt_idx" ON "AffiliateWithdrawal"("affiliateUserId", "status", "createdAt");

ALTER TABLE "AffiliateCommission"
ADD CONSTRAINT "AffiliateCommission_affiliateUserId_fkey"
FOREIGN KEY ("affiliateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateCommission"
ADD CONSTRAINT "AffiliateCommission_referredUserId_fkey"
FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateCommission"
ADD CONSTRAINT "AffiliateCommission_vipPaymentId_fkey"
FOREIGN KEY ("vipPaymentId") REFERENCES "VipPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateWithdrawal"
ADD CONSTRAINT "AffiliateWithdrawal_affiliateUserId_fkey"
FOREIGN KEY ("affiliateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
