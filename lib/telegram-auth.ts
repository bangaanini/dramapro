import { createHmac, timingSafeEqual } from "node:crypto";

import { ensureUserAffiliateCode, readAffiliateCookieCode } from "@/lib/affiliate";
import { getTelegramSettings } from "@/lib/app-settings";
import { decryptPaymentSecret } from "@/lib/payment-crypto";
import { prisma } from "@/lib/prisma";
import {
  getEnabledTelegramPartnerBot,
  normalizeTelegramBotUsername,
} from "@/lib/telegram-partner-bots";
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

type ResolvedTelegramPartnerBotContext = {
  botToken: string;
  id: string;
  ownerUserId: string;
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

export async function createTelegramUserSessionFromInitData(
  initData: string,
  referralCodeOverride?: string | null,
  botUsername?: string | null,
) {
  const normalizedBotUsername = normalizeTelegramBotUsername(botUsername);
  let partnerBot: ResolvedTelegramPartnerBotContext | null = normalizedBotUsername
    ? await getEnabledTelegramPartnerBot(normalizedBotUsername).then((resolved) =>
        resolved
          ? {
              botToken: resolved.botToken,
              id: resolved.id,
              ownerUserId: resolved.ownerUserId,
            }
          : null,
      )
    : null;

  if (normalizedBotUsername && !partnerBot) {
    throw new Error("Bot partner tidak ditemukan atau sedang nonaktif.");
  }

  let verified: VerifiedTelegramInitData | null = null;

  if (partnerBot) {
    verified = verifyTelegramInitData(initData, partnerBot.botToken);
  } else {
    const defaultToken = (await getTelegramSettings()).botToken?.trim() || null;
    const partnerCandidates = await prisma.telegramPartnerBot.findMany({
      where: {
        isEnabled: true,
      },
      select: {
        botTokenCiphertext: true,
        botUsername: true,
        id: true,
        ownerUserId: true,
      },
    });

    const candidateErrors: Error[] = [];

    if (defaultToken) {
      try {
        verified = verifyTelegramInitData(initData, defaultToken);
      } catch (error) {
        if (error instanceof Error) {
          candidateErrors.push(error);
        }
      }
    }

    if (!verified) {
      for (const candidate of partnerCandidates) {
        let candidateToken = "";

        try {
          candidateToken =
            decryptPaymentSecret(candidate.botTokenCiphertext)?.trim() || "";
        } catch {
          continue;
        }

        if (!candidateToken) {
          continue;
        }

        try {
          verified = verifyTelegramInitData(initData, candidateToken);
          partnerBot = {
            ...candidate,
            botToken: candidateToken,
          };
          break;
        } catch (error) {
          if (error instanceof Error) {
            candidateErrors.push(error);
          }
        }
      }
    }

    if (!verified) {
      if (!defaultToken && partnerCandidates.length === 0) {
        throw new Error("Telegram bot token belum diatur di server.");
      }

      throw (
        candidateErrors.find((error) =>
          /signature|hash|initData|telegram/i.test(error.message),
        ) ?? new Error("Signature Telegram tidak valid.")
      );
    }
  }

  if (!verified) {
    throw new Error("Payload Telegram tidak valid.");
  }

  const telegramId = String(verified.user.id);
  const displayName = buildTelegramDisplayName({
    firstName: verified.user.first_name,
    lastName: verified.user.last_name,
    username: verified.user.username,
  });

  const referralCode = partnerBot ? null : await readAffiliateCookieCode();
  const resolvedReferralCode = partnerBot
    ? null
    : referralCodeOverride?.trim().toUpperCase() || referralCode;
  const referralUser = resolvedReferralCode
    ? await prisma.user.findUnique({
        where: { affiliateCode: resolvedReferralCode },
        select: { id: true },
      })
    : null;

  const existingUser = await prisma.user.findUnique({
    where: {
      telegramId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      affiliateCode: true,
      authProvider: true,
      telegramId: true,
      telegramUsername: true,
      telegramPhotoUrl: true,
      telegramFirstName: true,
      telegramLastName: true,
      telegramLanguageCode: true,
      telegramMiniAppWelcomeSeenAt: true,
      createdAt: true,
      vipExpiresAt: true,
      vipStartedAt: true,
      referredById: true,
      referredByPartnerBotId: true,
    },
  });

  const partnerOwnerId = partnerBot?.ownerUserId ?? null;
  const referralOwnerId =
    partnerOwnerId && partnerOwnerId !== existingUser?.id
      ? partnerOwnerId
      : referralUser && referralUser.id !== existingUser?.id
        ? referralUser.id
        : null;
  const referralPartnerBotId =
    partnerBot && referralOwnerId === partnerOwnerId ? partnerBot.id : null;
  const shouldBackfillPartnerBot =
    Boolean(
      partnerBot &&
        partnerOwnerId &&
        existingUser?.referredById === partnerOwnerId &&
        !existingUser.referredByPartnerBotId,
    );

  const user = existingUser
    ? await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          authProvider: "telegram",
          name: displayName,
          telegramUsername: verified.user.username?.trim() || null,
          telegramPhotoUrl: verified.user.photo_url?.trim() || null,
          telegramFirstName: verified.user.first_name?.trim() || null,
          telegramLastName: verified.user.last_name?.trim() || null,
          telegramLanguageCode: verified.user.language_code?.trim() || null,
          referredById:
            existingUser.referredById ?? referralOwnerId ?? undefined,
          referredByPartnerBotId: existingUser.referredById
            ? shouldBackfillPartnerBot
              ? partnerBot?.id
              : undefined
            : referralPartnerBotId ?? undefined,
        },
        select: {
          id: true,
          email: true,
          name: true,
          affiliateCode: true,
          authProvider: true,
          telegramId: true,
          telegramUsername: true,
          telegramPhotoUrl: true,
          telegramFirstName: true,
          telegramLastName: true,
          telegramLanguageCode: true,
          telegramMiniAppWelcomeSeenAt: true,
          createdAt: true,
          vipExpiresAt: true,
          vipStartedAt: true,
        },
      })
    : await prisma.user.create({
        data: {
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
          referredById: referralOwnerId,
          referredByPartnerBotId: referralPartnerBotId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          affiliateCode: true,
          authProvider: true,
          telegramId: true,
          telegramUsername: true,
          telegramPhotoUrl: true,
          telegramFirstName: true,
          telegramLastName: true,
          telegramLanguageCode: true,
          telegramMiniAppWelcomeSeenAt: true,
          createdAt: true,
          vipExpiresAt: true,
          vipStartedAt: true,
        },
      });

  await ensureUserAffiliateCode(user.id, user.name);
  await createUserSession(user.id);

  return user satisfies PublicUser;
}
