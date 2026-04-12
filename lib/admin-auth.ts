import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE = "dramapro_admin_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getDefaultAdminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL ?? "admin@dramapro.local");
}

function getDefaultAdminName() {
  return process.env.ADMIN_NAME?.trim() || "Layar Drama Administrator";
}

function getBootstrapPassword() {
  return (
    process.env.ADMIN_PASSWORD?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    (process.env.NODE_ENV !== "production" ? "admin12345" : null)
  );
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

export async function ensureDefaultAdminExists() {
  const existingAdmin = await prisma.adminUser.findFirst({
    select: { id: true },
  });

  if (existingAdmin) {
    return;
  }

  const bootstrapPassword = getBootstrapPassword();

  if (!bootstrapPassword) {
    throw new Error(
      "Bootstrap admin password is not configured. Set ADMIN_PASSWORD or CRON_SECRET.",
    );
  }

  await prisma.adminUser.create({
    data: {
      email: getDefaultAdminEmail(),
      name: getDefaultAdminName(),
      passwordHash: hashPassword(bootstrapPassword),
    },
  });
}

export async function authenticateAdmin(email: string, password: string) {
  await ensureDefaultAdminExists();

  const admin = await prisma.adminUser.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  });

  if (!admin) {
    return null;
  }

  if (!verifyPassword(password, admin.passwordHash)) {
    return null;
  }

  return admin;
}

export async function changeAdminPassword(input: {
  adminUserId: string;
  currentPassword: string;
  nextPassword: string;
}) {
  const admin = await prisma.adminUser.findUnique({
    where: {
      id: input.adminUserId,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!admin) {
    throw new Error("Admin tidak ditemukan.");
  }

  if (!verifyPassword(input.currentPassword, admin.passwordHash)) {
    throw new Error("Password saat ini tidak sesuai.");
  }

  await prisma.adminUser.update({
    where: {
      id: admin.id,
    },
    data: {
      passwordHash: hashPassword(input.nextPassword),
    },
  });
}

export async function createAdminSession(adminUserId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.adminSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      expiresAt,
      adminUserId,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteCurrentAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.adminSession.deleteMany({
      where: {
        tokenHash: hashSessionToken(token),
      },
    });
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

async function validateSessionToken(token: string) {
  const session = await prisma.adminSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      adminUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.adminSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session.adminUser;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return validateSessionToken(token);
}

export async function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return validateSessionToken(token);
}
