import { NextRequest, NextResponse } from "next/server";

import {
  buildTelegramStartKeyboard,
  buildTelegramStartMessage,
  extractStartMessage,
  sendTelegramMessageWithToken,
} from "@/lib/telegram-bot";
import {
  buildPartnerBotSettingsUrl,
  getEnabledTelegramPartnerBot,
  normalizeTelegramBotUsername,
} from "@/lib/telegram-partner-bots";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/telegram/webhook/partner/[botUsername]">,
) {
  const { botUsername } = await context.params;
  const normalizedBotUsername = normalizeTelegramBotUsername(botUsername);
  const partnerBot = await getEnabledTelegramPartnerBot(normalizedBotUsername);

  if (!partnerBot) {
    return NextResponse.json(
      { error: "Partner bot tidak ditemukan atau nonaktif." },
      { status: 404 },
    );
  }

  const secret = request.headers.get("x-telegram-bot-api-secret-token");

  if (partnerBot.webhookSecret && secret !== partnerBot.webhookSecret) {
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

  const telegramUpdate = update as {
    message?: {
      from?: {
        id?: number;
      };
    };
  };
  const senderTelegramId =
    typeof telegramUpdate.message?.from?.id === "number"
      ? String(telegramUpdate.message.from.id)
      : null;
  const isOwnerRunningBot = Boolean(
    senderTelegramId &&
      partnerBot.owner.telegramId &&
      senderTelegramId === partnerBot.owner.telegramId,
  );
  const replyMarkup = await buildTelegramStartKeyboard(null, {
    botUsername: normalizedBotUsername,
    inlineButtons: partnerBot.inlineButtons,
    partnerBoxOfficeBotUrl: partnerBot.hasCustomInlineButtons
      ? null
      : partnerBot.boxOfficeBotUrl,
  });

  if (isOwnerRunningBot) {
    replyMarkup.inline_keyboard.push([
      {
        text: "⚙️ Setting",
        web_app: {
          url: await buildPartnerBotSettingsUrl(normalizedBotUsername),
        },
      },
    ]);
  }

  await sendTelegramMessageWithToken(partnerBot.botToken, {
    chat_id: startPayload.chatId,
    text: await buildTelegramStartMessage(startPayload.firstName, {
      botName: partnerBot.botUsername,
      botUsername: normalizedBotUsername,
      welcomeMessage: partnerBot.welcomeMessage,
    }),
    reply_markup: replyMarkup,
  });

  return NextResponse.json({ ok: true, partnerBot: normalizedBotUsername });
}
