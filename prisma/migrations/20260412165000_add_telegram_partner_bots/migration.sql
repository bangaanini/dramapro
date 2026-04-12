CREATE TABLE "TelegramPartnerBot" (
    "id" UUID NOT NULL,
    "botUsername" TEXT NOT NULL,
    "botTokenCiphertext" TEXT NOT NULL,
    "webhookSecretCiphertext" TEXT,
    "ownerUserId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramPartnerBot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramPartnerBot_botUsername_key" ON "TelegramPartnerBot"("botUsername");

CREATE INDEX "TelegramPartnerBot_ownerUserId_isEnabled_idx" ON "TelegramPartnerBot"("ownerUserId", "isEnabled");

ALTER TABLE "TelegramPartnerBot"
ADD CONSTRAINT "TelegramPartnerBot_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
