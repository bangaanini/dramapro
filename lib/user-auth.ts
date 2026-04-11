import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { ensureUserAffiliateCode, readAffiliateCookieCode } from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";

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

function mapPublicUser(user: {
  id: string;
  email: string;
  name: string;
  createdAt?: Date;
  vipExpiresAt?: Date | null;
  vipStartedAt?: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    vipExpiresAt: user.vipExpiresAt ?? null,
    vipStartedAt: user.vipStartedAt ?? null,
  };
}

export async function registerUser(input: {
  email: string;
  name: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const password = input.password.trim();

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
      passwordHash: hashPassword(password),
      referredById: referralUser?.id ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
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
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  });

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return mapPublicUser(user);
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
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
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
