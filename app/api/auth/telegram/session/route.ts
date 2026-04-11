import { NextRequest, NextResponse } from "next/server";

import { createTelegramUserSessionFromInitData } from "@/lib/telegram-auth";

export const runtime = "nodejs";

type TelegramSessionPayload = {
  initData?: unknown;
};

export async function POST(request: NextRequest) {
  let body: TelegramSessionPayload;

  try {
    body = (await request.json()) as TelegramSessionPayload;
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
    const user = await createTelegramUserSessionFromInitData(initData);

    return NextResponse.json({
      ok: true,
      source: "telegram",
      user,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Telegram session gagal dibuat.";
    const status =
      /signature|hash|initData|telegram/i.test(message) ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
