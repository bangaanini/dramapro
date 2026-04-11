import { createHmac, timingSafeEqual } from "node:crypto";

import { ensureUserAffiliateCode, readAffiliateCookieCode } from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import type { PublicUser } from "@/lib/user-auth";
import { createUserSession } from "@/lib/user-auth";
import { buildTelegramDisplayName } from "@/lib/user-identity";

type TelegramInitDataUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

type VerifiedTelegramInitData = {
  authDate: number;
  queryId: string | null;
  user: TelegramInitDataUser;
};

function parseTelegramInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("hash Telegram tidak ditemukan.");
  }

  return { params, hash };
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60 * 24,
): VerifiedTelegramInitData {
  const trimmed = initData.trim();

  if (!trimmed) {
    throw new Error("initData Telegram wajib diisi.");
  }

  const { params, hash } = parseTelegramInitData(trimmed);
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");

  if (!authDateRaw || !userRaw) {
    throw new Error("Payload Telegram tidak lengkap.");
  }

  const authDate = Number.parseInt(authDateRaw, 10);

  if (!Number.isFinite(authDate)) {
    throw new Error("auth_date Telegram tidak valid.");
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;

  if (ageSeconds > maxAgeSeconds) {
    throw new Error("initData Telegram sudah kedaluwarsa.");
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  const provided = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Signature Telegram tidak valid.");
  }

  const user = JSON.parse(userRaw) as TelegramInitDataUser;

  if (!user?.id) {
    throw new Error("User Telegram tidak ditemukan pada initData.");
  }

  return {
    authDate,
    queryId: params.get("query_id"),
    user,
  };
}

export async function createTelegramUserSessionFromInitData(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN belum diatur di server.");
  }

  const verified = verifyTelegramInitData(initData, botToken);
  const telegramId = String(verified.user.id);
  const displayName = buildTelegramDisplayName({
    firstName: verified.user.first_name,
    lastName: verified.user.last_name,
    username: verified.user.username,
  });

  const referralCode = await readAffiliateCookieCode();
  const referralUser =
    referralCode
      ? await prisma.user.findUnique({
          where: { affiliateCode: referralCode },
          select: { id: true },
        })
      : null;

  const user = await prisma.user.upsert({
    where: {
      telegramId,
    },
    update: {
      authProvider: "telegram",
      name: displayName,
      telegramUsername: verified.user.username?.trim() || null,
      telegramPhotoUrl: verified.user.photo_url?.trim() || null,
      telegramFirstName: verified.user.first_name?.trim() || null,
      telegramLastName: verified.user.last_name?.trim() || null,
      telegramLanguageCode: verified.user.language_code?.trim() || null,
    },
    create: {
      authProvider: "telegram",
      name: displayName,
      email: null,
      passwordHash: null,
      telegramId,
      telegramUsername: verified.user.username?.trim() || null,
      telegramPhotoUrl: verified.user.photo_url?.trim() || null,
      telegramFirstName: verified.user.first_name?.trim() || null,
      telegramLastName: verified.user.last_name?.trim() || null,
      telegramLanguageCode: verified.user.language_code?.trim() || null,
      referredById: referralUser?.id ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      authProvider: true,
      telegramId: true,
      telegramUsername: true,
      telegramPhotoUrl: true,
      telegramFirstName: true,
      telegramLastName: true,
      telegramLanguageCode: true,
      createdAt: true,
      vipExpiresAt: true,
      vipStartedAt: true,
    },
  });

  await ensureUserAffiliateCode(user.id, user.name);
  await createUserSession(user.id);

  return user satisfies PublicUser;
}
