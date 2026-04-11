CREATE TYPE "UserAuthProvider" AS ENUM ('local', 'telegram');

ALTER TABLE "User"
ADD COLUMN "authProvider" "UserAuthProvider" NOT NULL DEFAULT 'local',
ADD COLUMN "telegramId" TEXT,
ADD COLUMN "telegramUsername" TEXT,
ADD COLUMN "telegramPhotoUrl" TEXT,
ADD COLUMN "telegramFirstName" TEXT,
ADD COLUMN "telegramLastName" TEXT,
ADD COLUMN "telegramLanguageCode" TEXT;

ALTER TABLE "User"
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
