CREATE TYPE "VipPaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'expired', 'cancelled');

ALTER TABLE "User"
ADD COLUMN "vipStartedAt" TIMESTAMP(3),
ADD COLUMN "vipExpiresAt" TIMESTAMP(3);

CREATE TABLE "VipPayment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "vipPricePlanId" UUID NOT NULL,
    "referenceId" TEXT NOT NULL,
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

CREATE UNIQUE INDEX "VipPayment_referenceId_key" ON "VipPayment"("referenceId");
CREATE UNIQUE INDEX "VipPayment_providerTransactionId_key" ON "VipPayment"("providerTransactionId");
CREATE INDEX "VipPayment_userId_status_createdAt_idx" ON "VipPayment"("userId", "status", "createdAt");
CREATE INDEX "VipPayment_vipPricePlanId_createdAt_idx" ON "VipPayment"("vipPricePlanId", "createdAt");

ALTER TABLE "VipPayment"
ADD CONSTRAINT "VipPayment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VipPayment"
ADD CONSTRAINT "VipPayment_vipPricePlanId_fkey"
FOREIGN KEY ("vipPricePlanId") REFERENCES "VipPricePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
