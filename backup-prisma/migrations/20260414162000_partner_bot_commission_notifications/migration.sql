-- Track which partner bot attributed a Telegram referral and which commissions
-- need Telegram owner notifications. Existing referrals keep working because
-- every new field is nullable.
ALTER TABLE "User"
ADD COLUMN "referredByPartnerBotId" UUID;

ALTER TABLE "AffiliateCommission"
ADD COLUMN "partnerBotId" UUID,
ADD COLUMN "notificationSentAt" TIMESTAMP(3),
ADD COLUMN "notificationError" TEXT NOT NULL DEFAULT '';

CREATE INDEX "User_referredByPartnerBotId_createdAt_idx"
ON "User"("referredByPartnerBotId", "createdAt");

CREATE INDEX "AffiliateCommission_partnerBotId_createdAt_idx"
ON "AffiliateCommission"("partnerBotId", "createdAt");

ALTER TABLE "User"
ADD CONSTRAINT "User_referredByPartnerBotId_fkey"
FOREIGN KEY ("referredByPartnerBotId")
REFERENCES "TelegramPartnerBot"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "AffiliateCommission"
ADD CONSTRAINT "AffiliateCommission_partnerBotId_fkey"
FOREIGN KEY ("partnerBotId")
REFERENCES "TelegramPartnerBot"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
