CREATE TYPE "PaymentGatewayProvider" AS ENUM ('paymenku', 'xendit', 'midtrans', 'tripay', 'doku');

CREATE TABLE "PaymentGatewaySettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "activeProvider" "PaymentGatewayProvider",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewaySettings_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");

ALTER TABLE "VipPayment"
ADD COLUMN "gatewayProvider" "PaymentGatewayProvider" NOT NULL DEFAULT 'paymenku';
