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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliatePayoutProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliatePayoutProfile_userId_key" ON "AffiliatePayoutProfile"("userId");

ALTER TABLE "AffiliateWithdrawal"
ADD COLUMN "payoutAccountHolderName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "payoutBankName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "payoutAccountNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "payoutWhatsappNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN "payoutEmail" TEXT NOT NULL DEFAULT '';

ALTER TABLE "AffiliatePayoutProfile"
ADD CONSTRAINT "AffiliatePayoutProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
