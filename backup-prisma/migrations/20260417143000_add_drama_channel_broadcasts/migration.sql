ALTER TABLE "TelegramPartnerBot"
ADD COLUMN "defaultChannelUsername" TEXT NOT NULL DEFAULT '';

CREATE TABLE "DramaChannelBroadcast" (
    "id" UUID NOT NULL,
    "dramaId" UUID NOT NULL,
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

CREATE INDEX "DramaChannelBroadcast_dramaId_createdAt_idx" ON "DramaChannelBroadcast"("dramaId", "createdAt");
CREATE INDEX "DramaChannelBroadcast_ownerUserId_createdAt_idx" ON "DramaChannelBroadcast"("ownerUserId", "createdAt");
CREATE INDEX "DramaChannelBroadcast_partnerBotId_createdAt_idx" ON "DramaChannelBroadcast"("partnerBotId", "createdAt");
CREATE INDEX "DramaChannelBroadcast_botKind_createdAt_idx" ON "DramaChannelBroadcast"("botKind", "createdAt");

ALTER TABLE "DramaChannelBroadcast"
ADD CONSTRAINT "DramaChannelBroadcast_dramaId_fkey"
FOREIGN KEY ("dramaId") REFERENCES "Drama"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DramaChannelBroadcast"
ADD CONSTRAINT "DramaChannelBroadcast_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DramaChannelBroadcast"
ADD CONSTRAINT "DramaChannelBroadcast_partnerBotId_fkey"
FOREIGN KEY ("partnerBotId") REFERENCES "TelegramPartnerBot"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
