import { NextRequest, NextResponse } from "next/server";

import {
  createAdminSession,
  getPrimaryAdminForSession,
} from "@/lib/admin-auth";
import { getTelegramSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { isMainTelegramAdminIdentity } from "@/lib/telegram-admin";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

export const runtime = "nodejs";

type TelegramAdminSessionPayload = {
  initData?: unknown;
};

export async function POST(request: NextRequest) {
  let body: TelegramAdminSessionPayload;

  try {
    body = (await request.json()) as TelegramAdminSessionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const initData =
    typeof body.initData === "string" ? body.initData.trim() : "";

  if (!initData) {
    return NextResponse.json(
      { error: "initData Telegram wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const telegramSettings = await getTelegramSettings();
    const botToken = telegramSettings.botToken?.trim();

    if (!botToken) {
      return NextResponse.json(
        { error: "Token bot utama belum diatur." },
        { status: 500 },
      );
    }

    const verified = verifyTelegramInitData(initData, botToken);
    const isMainAdmin = await isMainTelegramAdminIdentity({
      telegramId: verified.user.id,
      telegramUsername: verified.user.username,
    });

    if (!isMainAdmin) {
      return NextResponse.json(
        { error: "Akun Telegram ini bukan admin utama." },
        { status: 403 },
      );
    }

    const admin = await getPrimaryAdminForSession();

    // Update telegramId admin jika belum tersimpan
    const telegramId = String(verified.user.id);
    if (admin.telegramId !== telegramId) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { telegramId },
      });
    }

    await createAdminSession(admin.id);

    return NextResponse.json({
      ok: true,
      admin: {
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Sesi admin Telegram gagal dibuat.";
    const status =
      /signature|hash|initData|telegram/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
