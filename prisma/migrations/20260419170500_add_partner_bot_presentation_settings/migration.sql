ALTER TABLE "TelegramPartnerBot"
ADD COLUMN "welcomeMessage" TEXT NOT NULL DEFAULT '',
ADD COLUMN "inlineButtons" JSONB;
