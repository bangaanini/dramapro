import { absoluteUrl, getSiteUrl } from "@/lib/site";

type TelegramInlineKeyboardButton = {
  text: string;
  url?: string;
  web_app?: {
    url: string;
  };
};

type TelegramSendMessagePayload = {
  chat_id: number;
  text: string;
  reply_markup?: {
    inline_keyboard: TelegramInlineKeyboardButton[][];
  };
};

type TelegramWebhookMessage = {
  message?: {
    chat: {
      id: number;
    };
    text?: string;
    from?: {
      first_name?: string;
    };
  };
};

function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN belum diatur.");
  }

  return token;
}

export function getTelegramSupportUrl() {
  const direct = process.env.TELEGRAM_SUPPORT_URL?.trim();

  if (direct) {
    return direct;
  }

  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  return username ? `https://t.me/${username}` : getSiteUrl();
}

export function getTelegramMiniAppUrl(target: "home" | "search" | "vip" | "profile" | "affiliate") {
  const rawBaseUrl = process.env.TELEGRAM_MINI_APP_URL?.trim() || getSiteUrl();
  const normalizedBaseUrl =
    rawBaseUrl.startsWith("http://") || rawBaseUrl.startsWith("https://")
      ? rawBaseUrl
      : absoluteUrl(rawBaseUrl);
  const url = new URL(normalizedBaseUrl);
  url.pathname = "/";
  url.searchParams.set("tg_target", target);
  return url.toString();
}

export function buildTelegramStartMessage(firstName?: string) {
  const safeName = firstName?.trim() || "Sobat Drama";

  return [
    `Hai ${safeName}! Selamat datang di DramaPro!`,
    "",
    "Tonton ribuan short drama seru tanpa batas!",
    "",
    "Klik tombol di bawah untuk mulai nonton:",
  ].join("\n");
}

export function buildTelegramStartKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🎬 Buka", web_app: { url: getTelegramMiniAppUrl("home") } }],
      [{ text: "🔍 Cari Judul", web_app: { url: getTelegramMiniAppUrl("search") } }],
      [{ text: "💎 Beli VIP", web_app: { url: getTelegramMiniAppUrl("vip") } }],
      [{ text: "👤 Profile", web_app: { url: getTelegramMiniAppUrl("profile") } }],
      [{ text: "💬 Lapor Kendala", url: getTelegramSupportUrl() }],
      [{ text: "💰 Cari Cuan Referral", web_app: { url: getTelegramMiniAppUrl("affiliate") } }],
    ],
  };
}

export async function sendTelegramMessage(payload: TelegramSendMessagePayload) {
  const token = getTelegramBotToken();
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Telegram sendMessage gagal: ${response.status} ${text}`.trim());
  }

  return response.json().catch(() => null);
}

export function isTelegramWebhookAuthorized(secretHeader: string | null) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!expected) {
    return true;
  }

  return secretHeader === expected;
}

export function extractStartMessage(update: TelegramWebhookMessage) {
  const text = update.message?.text?.trim();

  if (!text || !text.startsWith("/start")) {
    return null;
  }

  const chatId = update.message?.chat?.id;

  if (!chatId) {
    return null;
  }

  return {
    chatId,
    firstName: update.message?.from?.first_name?.trim() || undefined,
  };
}
