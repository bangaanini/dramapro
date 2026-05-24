import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { authenticateAdmin } from "@/lib/admin-auth";
import { ensureUserAffiliateCode, readAffiliateCookieCode } from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { resolveUserPaymentEmail } from "@/lib/user-identity";

export const USER_SESSION_COOKIE = "dramapro_user_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actualHash, expected);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type PublicUser = {
  id: string;
  email: string | null;
  name: string;
  affiliateCode: string | null;
  authProvider: "local" | "telegram";
  hasWebAccount: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramPhotoUrl: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  telegramLanguageCode: string | null;
  telegramMiniAppWelcomeSeenAt?: Date | null;
  referredByPartnerBotId?: string | null;
  createdAt?: Date;
  vipExpiresAt?: Date | null;
  vipStartedAt?: Date | null;
};

export function mapPublicUser(user: {
  id: string;
  email: string | null;
  name: string;
  affiliateCode: string | null;
  authProvider: "local" | "telegram";
  passwordHash?: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramPhotoUrl: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  telegramLanguageCode: string | null;
  telegramMiniAppWelcomeSeenAt?: Date | null;
  referredByPartnerBotId?: string | null;
  createdAt?: Date;
  vipExpiresAt?: Date | null;
  vipStartedAt?: Date | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    affiliateCode: user.affiliateCode,
    authProvider: user.authProvider,
    hasWebAccount: Boolean(user.email && user.passwordHash),
    telegramId: user.telegramId,
    telegramUsername: user.telegramUsername,
    telegramPhotoUrl: user.telegramPhotoUrl,
    telegramFirstName: user.telegramFirstName,
    telegramLastName: user.telegramLastName,
    telegramLanguageCode: user.telegramLanguageCode,
    telegramMiniAppWelcomeSeenAt: user.telegramMiniAppWelcomeSeenAt ?? null,
    referredByPartnerBotId: user.referredByPartnerBotId ?? null,
    createdAt: user.createdAt,
    vipExpiresAt: user.vipExpiresAt ?? null,
    vipStartedAt: user.vipStartedAt ?? null,
  };
}

export async function registerUser(input: {
  email: string;
  name: string;
  password: string;
  telegramUsername?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const password = input.password.trim();
  const rawTelegramUsername = input.telegramUsername?.trim() ?? "";
  const telegramUsername = rawTelegramUsername
    ? rawTelegramUsername.replace(/^@/, "").toLowerCase()
    : null;

  if (!email || !name || !password) {
    return {
      ok: false as const,
      error: "Nama, email, dan password wajib diisi.",
    };
  }

  if (name.length < 2) {
    return {
      ok: false as const,
      error: "Nama minimal 2 karakter.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false as const,
      error: "Password minimal 8 karakter.",
    };
  }

  if (telegramUsername && !/^[a-z0-9_]{3,32}$/i.test(telegramUsername)) {
    return {
      ok: false as const,
      error: "Format Telegram username tidak valid.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false as const,
      error: "Email sudah terdaftar. Silakan masuk.",
    };
  }

  const referralCode = await readAffiliateCookieCode();
  const referralUser = referralCode
    ? await prisma.user.findUnique({
        where: { affiliateCode: referralCode },
        select: { id: true },
      })
    : null;

  const user = await prisma.user.create({
    data: {
      email,
      name,
      authProvider: "local",
      passwordHash: hashPassword(password),
      telegramUsername,
      referredById: referralUser?.id ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      affiliateCode: true,
      authProvider: true,
      passwordHash: true,
      telegramId: true,
      telegramUsername: true,
      telegramPhotoUrl: true,
      telegramFirstName: true,
      telegramLastName: true,
      telegramLanguageCode: true,
      telegramMiniAppWelcomeSeenAt: true,
      referredByPartnerBotId: true,
      createdAt: true,
      vipExpiresAt: true,
      vipStartedAt: true,
    },
  });

  await ensureUserAffiliateCode(user.id, user.name);

  return {
    ok: true as const,
    user: mapPublicUser(user),
  };
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (
    user?.passwordHash &&
    verifyPassword(password, user.passwordHash)
  ) {
    return mapPublicUser(user);
  }

  const admin = await authenticateAdmin(normalizedEmail, password);

  if (!admin) {
    return null;
  }

  const adminUser = await prisma.user.upsert({
    where: {
      email: admin.email,
    },
    create: {
      email: admin.email,
      name: admin.name,
      authProvider: "local",
      passwordHash: admin.passwordHash,
    },
    update: {
      name: admin.name,
      authProvider: "local",
      passwordHash: admin.passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      affiliateCode: true,
      authProvider: true,
      passwordHash: true,
      telegramId: true,
      telegramUsername: true,
      telegramPhotoUrl: true,
      telegramFirstName: true,
      telegramLastName: true,
      telegramLanguageCode: true,
      telegramMiniAppWelcomeSeenAt: true,
      referredByPartnerBotId: true,
      createdAt: true,
      vipExpiresAt: true,
      vipStartedAt: true,
    },
  });

  await ensureUserAffiliateCode(adminUser.id, adminUser.name);

  return mapPublicUser(adminUser);
}

export async function setupWebAccount(input: {
  userId: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  const confirmPassword = input.confirmPassword.trim();

  if (!email || !password || !confirmPassword) {
    return {
      ok: false as const,
      error: "Email dan password wajib diisi.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false as const,
      error: "Format email tidak valid.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false as const,
      error: "Password minimal 8 karakter.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false as const,
      error: "Konfirmasi password tidak cocok.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return {
      ok: false as const,
      error: "Akun tidak ditemukan.",
    };
  }

  if (user.passwordHash) {
    return {
      ok: false as const,
      error: "Akun web sudah pernah dibuat. Pakai menu Ganti Password jika ingin mengubah.",
    };
  }

  const conflictingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (conflictingUser && conflictingUser.id !== user.id) {
    return {
      ok: false as const,
      error: "Email sudah dipakai akun lain. Gunakan email yang berbeda.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email,
      passwordHash: hashPassword(password),
    },
  });

  return {
    ok: true as const,
  };
}

export async function changeCurrentUserPassword(input: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
}) {
  const currentPassword = input.currentPassword.trim();
  const nextPassword = input.nextPassword.trim();
  const confirmPassword = input.confirmPassword.trim();

  if (!currentPassword || !nextPassword || !confirmPassword) {
    return {
      ok: false as const,
      error: "Semua field password wajib diisi.",
    };
  }

  if (nextPassword.length < 8) {
    return {
      ok: false as const,
      error: "Password baru minimal 8 karakter.",
    };
  }

  if (nextPassword !== confirmPassword) {
    return {
      ok: false as const,
      error: "Konfirmasi password baru tidak cocok.",
    };
  }

  if (currentPassword === nextPassword) {
    return {
      ok: false as const,
      error: "Password baru harus berbeda dari password saat ini.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      authProvider: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return {
      ok: false as const,
      error: "Akun tidak ditemukan.",
    };
  }

  if (!user.passwordHash) {
    return {
      ok: false as const,
      error: "Akun belum memiliki password. Atur akun web terlebih dahulu.",
    };
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return {
      ok: false as const,
      error: "Password saat ini tidak valid.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(nextPassword),
    },
  });

  return {
    ok: true as const,
  };
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.userSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      expiresAt,
      userId,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteCurrentUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.userSession.deleteMany({
      where: {
        tokenHash: hashSessionToken(token),
      },
    });
  }

  cookieStore.delete(USER_SESSION_COOKIE);
}

async function validateSessionToken(token: string) {
  const session = await prisma.userSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          affiliateCode: true,
          authProvider: true,
          passwordHash: true,
          telegramId: true,
          telegramUsername: true,
          telegramPhotoUrl: true,
          telegramFirstName: true,
          telegramLastName: true,
          telegramLanguageCode: true,
          telegramMiniAppWelcomeSeenAt: true,
          referredByPartnerBotId: true,
          createdAt: true,
          vipExpiresAt: true,
          vipStartedAt: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.userSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return mapPublicUser(session.user);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return validateSessionToken(token);
}

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return validateSessionToken(token);
}

export function resolveSafeRedirectPath(candidate: string | null | undefined) {
  if (!candidate) {
    return "/";
  }

  const normalized = candidate.trim();

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return "/";
  }

  return normalized;
}

export function resolveUserPaymentContactEmail(user: PublicUser) {
  return resolveUserPaymentEmail(user);
}

export async function setTelegramUsername(input: {
  userId: string;
  telegramUsername: string;
}) {
  const raw = input.telegramUsername.trim();

  if (!raw) {
    return {
      ok: false as const,
      error: "Telegram username wajib diisi.",
    };
  }

  const normalized = raw.replace(/^@/, "").toLowerCase();

  if (!/^[a-z0-9_]{3,32}$/i.test(normalized)) {
    return {
      ok: false as const,
      error: "Format Telegram username tidak valid.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, telegramId: true },
  });

  if (!user) {
    return {
      ok: false as const,
      error: "Akun tidak ditemukan.",
    };
  }

  if (user.telegramId) {
    return {
      ok: false as const,
      error: "Akun ini sudah terhubung dengan Telegram.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramUsername: normalized },
  });

  return {
    ok: true as const,
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const firstChar = local[0] ?? "*";
  return `${firstChar}***@${domain}`;
}

export async function findMergeCandidate(
  currentUserId: string,
  telegramUsername: string | null,
) {
  const normalized = telegramUsername?.trim().replace(/^@/, "").toLowerCase() ?? "";

  if (!normalized) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: { not: currentUserId },
      passwordHash: { not: null },
      email: { not: null },
      telegramUsername: { equals: normalized, mode: "insensitive" },
      telegramId: null,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });
}

// CATATAN: kalau menambah tabel baru dengan FK ke User, update fungsi ini.
// Daftar tabel di sini harus sinkron dengan semua relasi `User.@relation` di
// schema.prisma. Lihat docs/superpowers/specs/2026-05-18-akun-web-mini-app-design.md
// Section 4 untuk detail algoritma.
export async function mergeUsers(input: {
  winnerId: string;
  loserId: string;
  providedPassword: string;
}) {
  const { winnerId, loserId, providedPassword } = input;

  if (winnerId === loserId) {
    return { ok: true as const, mergedUserId: winnerId };
  }

  const [winner, loser] = await Promise.all([
    prisma.user.findUnique({ where: { id: winnerId } }),
    prisma.user.findUnique({ where: { id: loserId } }),
  ]);

  if (!winner || !loser) {
    return { ok: false as const, error: "Akun tidak ditemukan." };
  }

  if (!winner.passwordHash) {
    return { ok: false as const, error: "Akun web tidak memiliki password." };
  }

  if (!verifyPassword(providedPassword, winner.passwordHash)) {
    return { ok: false as const, error: "Password salah." };
  }

  if (!loser.telegramId) {
    return {
      ok: false as const,
      error: "Akun mini-app tidak memiliki Telegram ID.",
    };
  }

  const winnerUpdate = {
    telegramId: loser.telegramId,
    telegramUsername: loser.telegramUsername,
    telegramPhotoUrl: loser.telegramPhotoUrl,
    telegramFirstName: loser.telegramFirstName,
    telegramLastName: loser.telegramLastName,
    telegramLanguageCode: loser.telegramLanguageCode,
    telegramMiniAppWelcomeSeenAt: minDate(
      winner.telegramMiniAppWelcomeSeenAt,
      loser.telegramMiniAppWelcomeSeenAt,
    ),
    name: winner.name?.trim() ? winner.name : loser.name,
    vipStartedAt: minDate(winner.vipStartedAt, loser.vipStartedAt),
    vipExpiresAt: maxDate(winner.vipExpiresAt, loser.vipExpiresAt),
    affiliateCode: winner.affiliateCode ?? loser.affiliateCode,
    affiliateCommissionOverrideRate:
      winner.affiliateCommissionOverrideRate ??
      loser.affiliateCommissionOverrideRate,
    referredById: winner.referredById ?? loser.referredById,
    referredByPartnerBotId:
      winner.referredByPartnerBotId ?? loser.referredByPartnerBotId,
    authProvider: "telegram" as const,
  };

  const stats = await prisma.$transaction(async (tx) => {
    // 1. Detach loser dari telegramId untuk lepas constraint @unique
    await tx.user.update({
      where: { id: loserId },
      data: { telegramId: null },
    });

    // 2. Dedupe + repoint untuk tabel dengan unique constraint melibatkan userId
    // FavoriteDrama: @@unique([userId, seriesId]) — prefer winner
    const winnerFavorites = await tx.favoriteDrama.findMany({
      where: { userId: winnerId },
      select: { seriesId: true },
    });
    if (winnerFavorites.length > 0) {
      await tx.favoriteDrama.deleteMany({
        where: {
          userId: loserId,
          seriesId: { in: winnerFavorites.map((row) => row.seriesId) },
        },
      });
    }

    // SavedEpisode: @@unique([userId, seriesId, episodeIndex]) — prefer winner
    const winnerSaved = await tx.savedEpisode.findMany({
      where: { userId: winnerId },
      select: { seriesId: true, episodeIndex: true },
    });
    for (const row of winnerSaved) {
      await tx.savedEpisode.deleteMany({
        where: {
          userId: loserId,
          seriesId: row.seriesId,
          episodeIndex: row.episodeIndex,
        },
      });
    }

    // WatchHistory: @@unique([userId, seriesId]) — prefer yang updatedAt terbaru
    const loserHistory = await tx.watchHistory.findMany({
      where: { userId: loserId },
      select: { id: true, seriesId: true, updatedAt: true },
    });
    if (loserHistory.length > 0) {
      const winnerHistory = await tx.watchHistory.findMany({
        where: {
          userId: winnerId,
          seriesId: { in: loserHistory.map((row) => row.seriesId) },
        },
        select: { id: true, seriesId: true, updatedAt: true },
      });
      const winnerBySeries = new Map(
        winnerHistory.map((row) => [row.seriesId, row] as const),
      );
      for (const loserRow of loserHistory) {
        const winnerRow = winnerBySeries.get(loserRow.seriesId);
        if (!winnerRow) continue;
        if (loserRow.updatedAt > winnerRow.updatedAt) {
          await tx.watchHistory.delete({ where: { id: winnerRow.id } });
        } else {
          await tx.watchHistory.delete({ where: { id: loserRow.id } });
        }
      }
    }

    // PartnerBotDownloadLog: @@unique([partnerBotId, userId, seriesId, episodeIndex, periodKey])
    const winnerLogs = await tx.partnerBotDownloadLog.findMany({
      where: { userId: winnerId },
      select: {
        partnerBotId: true,
        seriesId: true,
        episodeIndex: true,
        periodKey: true,
      },
    });
    for (const row of winnerLogs) {
      await tx.partnerBotDownloadLog.deleteMany({
        where: {
          userId: loserId,
          partnerBotId: row.partnerBotId,
          seriesId: row.seriesId,
          episodeIndex: row.episodeIndex,
          periodKey: row.periodKey,
        },
      });
    }

    // AffiliatePayoutProfile: userId @unique — pertahankan winner kalau ada
    const winnerPayout = await tx.affiliatePayoutProfile.findUnique({
      where: { userId: winnerId },
      select: { id: true },
    });
    if (winnerPayout) {
      await tx.affiliatePayoutProfile.deleteMany({
        where: { userId: loserId },
      });
    }

    // PushSubscription: endpoint @unique — konflik rare, dedupe by endpoint
    const winnerPush = await tx.pushSubscription.findMany({
      where: { userId: winnerId },
      select: { endpoint: true },
    });
    if (winnerPush.length > 0) {
      await tx.pushSubscription.deleteMany({
        where: {
          userId: loserId,
          endpoint: { in: winnerPush.map((row) => row.endpoint) },
        },
      });
    }

    // 3. Re-point semua FK
    const repointResults = {
      sessions: await tx.userSession.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      analyticsVisitors: await tx.analyticsVisitor.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      analyticsSessions: await tx.analyticsSession.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      analyticsEvents: await tx.analyticsEvent.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      favorites: await tx.favoriteDrama.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      savedEpisodes: await tx.savedEpisode.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      watchHistory: await tx.watchHistory.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      vipPayments: await tx.vipPayment.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      affiliateCommissionsOwner: await tx.affiliateCommission.updateMany({
        where: { affiliateUserId: loserId },
        data: { affiliateUserId: winnerId },
      }),
      affiliateCommissionsReferred: await tx.affiliateCommission.updateMany({
        where: { referredUserId: loserId },
        data: { referredUserId: winnerId },
      }),
      affiliateWithdrawals: await tx.affiliateWithdrawal.updateMany({
        where: { affiliateUserId: loserId },
        data: { affiliateUserId: winnerId },
      }),
      affiliatePayoutProfile: await tx.affiliatePayoutProfile.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      partnerBots: await tx.telegramPartnerBot.updateMany({
        where: { ownerUserId: loserId },
        data: { ownerUserId: winnerId },
      }),
      channelBroadcasts: await tx.dramaChannelBroadcast.updateMany({
        where: { ownerUserId: loserId },
        data: { ownerUserId: winnerId },
      }),
      partnerDownloadLogs: await tx.partnerBotDownloadLog.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      pushSubscriptions: await tx.pushSubscription.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      pushDeliveries: await tx.pushNotificationDelivery.updateMany({
        where: { userId: loserId },
        data: { userId: winnerId },
      }),
      // User.referredById self-relation: user lain yang refer ke loser
      referredUsers: await tx.user.updateMany({
        where: { referredById: loserId },
        data: { referredById: winnerId },
      }),
    };

    // 4. Field-level update winner (termasuk telegramId dari loser)
    await tx.user.update({
      where: { id: winnerId },
      data: winnerUpdate,
    });

    // 5. Hapus loser
    await tx.user.delete({ where: { id: loserId } });

    return repointResults;
  });

  console.log(
    "[user-merge]",
    JSON.stringify({
      event: "user_merge",
      winnerId,
      loserId,
      mergedAt: new Date().toISOString(),
      telegramIdMoved: loser.telegramId,
      vipExpiresChosen: winnerUpdate.vipExpiresAt,
      affiliateCodeKept: winnerUpdate.affiliateCode,
      partnerBotMoved: stats.partnerBots.count,
      favoritesMoved: stats.favorites.count,
      watchHistoryMoved: stats.watchHistory.count,
      vipPaymentsMoved: stats.vipPayments.count,
    }),
  );

  return { ok: true as const, mergedUserId: winnerId };
}

function minDate(a: Date | null | undefined, b: Date | null | undefined) {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  return a.getTime() <= b.getTime() ? a : b;
}

function maxDate(a: Date | null | undefined, b: Date | null | undefined) {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  return a.getTime() >= b.getTime() ? a : b;
}

export async function userHasAdminVideoBypass(
  user: Pick<PublicUser, "email"> | null | undefined,
) {
  if (!user?.email) {
    return false;
  }

  const admin = await prisma.adminUser.findUnique({
    where: {
      email: normalizeEmail(user.email),
    },
    select: {
      id: true,
    },
  });

  return Boolean(admin);
}

export async function resetUserPassword(input: {
  email: string;
  newPassword: string;
}) {
  const email = normalizeEmail(input.email);
  const newPassword = input.newPassword.trim();

  if (!email || !newPassword) {
    return {
      ok: false as const,
      error: "Email dan password wajib diisi.",
    };
  }

  if (newPassword.length < 8) {
    return {
      ok: false as const,
      error: "Password minimal 8 karakter.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return {
      ok: false as const,
      error: "Email tidak ditemukan.",
    };
  }

  if (!user.passwordHash) {
    return {
      ok: false as const,
      error: "Akun ini tidak memiliki password. Gunakan login Telegram.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
    },
  });

  return {
    ok: true as const,
  };
}
