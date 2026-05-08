import { NextRequest, NextResponse } from "next/server";

import {
  buildTelegramStartKeyboard,
  buildTelegramStartMessage,
  extractStartMessage,
  isTelegramWebhookAuthorized,
  sendTelegramMessage,
} from "@/lib/telegram-bot";
import { isMainTelegramAdminIdentity } from "@/lib/telegram-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!(await isTelegramWebhookAuthorized(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!update) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const startPayload = extractStartMessage(update as never);

  if (!startPayload) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const isMainAdmin = await isMainTelegramAdminIdentity({
    telegramId: startPayload.telegramUserId,
    telegramUsername: startPayload.telegramUsername,
  });

  await sendTelegramMessage({
    chat_id: startPayload.chatId,
    text: `${await buildTelegramStartMessage(startPayload.firstName)}${
      isMainAdmin ? "\n\n🔐 Mode admin utama aktif." : ""
    }`,
    reply_markup: await buildTelegramStartKeyboard(startPayload.referralCode, {
      isMainAdmin,
    }),
  });

  return NextResponse.json({ ok: true });
}
