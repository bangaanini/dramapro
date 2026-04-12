import {
  absoluteUrlFromSiteUrl,
  getAppSettings,
  getTelegramSettings,
} from "@/lib/app-settings";
import { normalizeTelegramBotUsername } from "@/lib/telegram-partner-bots";

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

type TelegramMiniAppTarget = "home" | "search" | "vip" | "profile" | "affiliate";

const TELEGRAM_DRAMA_CHANNEL_URL = "https://t.me/LayarDramaID";
const TELEGRAM_MOVIE_CHANNEL_URL = "https://t.me/layarboxoffice";

async function getTelegramBotToken() {
  const token = (await getTelegramSettings()).botToken?.trim();

  if (!token) {
    throw new Error("Telegram bot token belum diatur.");
  }

  return token;
}

export async function getTelegramSupportUrl() {
  return (await getTelegramSettings()).supportUrl;
}

export async function getTelegramMiniAppUrl(
  target: TelegramMiniAppTarget,
  options?: {
    referralCode?: string | null;
    botUsername?: string | null;
  },
) {
  const settings = await getTelegramSettings();
  const url = new URL(settings.miniAppUrl);

  url.pathname = "/";
  url.searchParams.set("tg_target", target);

  const botUsername = normalizeTelegramBotUsername(options?.botUsername);

  if (botUsername) {
    url.searchParams.set("tg_bot", botUsername);
  }

  if (options?.referralCode) {
    url.searchParams.set("tg_ref", options.referralCode);
  }

  return url.toString();
}

export async function buildTelegramMiniAppStartAppLink(startParam: string) {
  const username = (await getTelegramSettings()).botUsername?.replace(/^@/, "");

  if (!username) {
    throw new Error("Telegram bot username belum diatur.");
  }

  return `https://t.me/${username}?startapp=${encodeURIComponent(startParam)}`;
}

export function buildDramaShareStartParam(input: {
  dramaId: string;
  referralCode?: string | null;
}) {
  const dramaId = input.dramaId.trim();
  const referralCode = input.referralCode?.trim().toUpperCase();

  if (!dramaId) {
    throw new Error("Drama ID wajib diisi untuk startapp Telegram.");
  }

  return referralCode
    ? `drama_${dramaId}__ref_${referralCode}`
    : `drama_${dramaId}`;
}

export async function buildTelegramStartMessage(firstName?: string) {
  const safeName = firstName?.trim() || "Sobat Drama";
  const siteName = (await getAppSettings()).site.name;

  return [
    `👋 Hai ${safeName}! Selamat datang di ${siteName}`,
    "",
    "🎬 Nonton Drama China & Film Box Office langsung dari Telegram!",
    "🔥 Tanpa ribet • Full HD • Update setiap hari",
    "",
    "📌 Cara pakai:",
    "• Buka -> Langsung mulai nonton",
    "• Cari Judul -> Cari drama / film favoritmu",
    "• Gabung Affiliate -> Dapat cuan dari Telegram",
    "• Channel Drama -> Drama China trending",
    "• Channel Movie -> Film bioskop & box office",
    "• Hubungi Admin -> Jika ada kendala",
    "• Join VIP -> Buka semua koleksi",
    "",
    "👇 Pilih menu di bawah dan mulai sekarang",
  ].join("\n");
}

export async function buildTelegramStartKeyboard(
  referralCode?: string | null,
  options?: {
    botUsername?: string | null;
  },
) {
  const miniAppOptions = {
    referralCode,
    botUsername: options?.botUsername,
  };

  return {
    inline_keyboard: [
      [
        {
          text: "🎬 Buka",
          web_app: { url: await getTelegramMiniAppUrl("home", miniAppOptions) },
        },
      ],
      [
        {
          text: "🔍 Cari Judul",
          web_app: { url: await getTelegramMiniAppUrl("search", miniAppOptions) },
        },
      ],
      [
        {
          text: "💰 Gabung Affiliate",
          web_app: {
            url: await getTelegramMiniAppUrl("affiliate", miniAppOptions),
          },
        },
      ],
      [
        { text: "🏠 Channel Drama", url: TELEGRAM_DRAMA_CHANNEL_URL },
        { text: "🎥 Channel Movie", url: TELEGRAM_MOVIE_CHANNEL_URL },
      ],
      [
        { text: "📞 Hubungi Admin", url: await getTelegramSupportUrl() },
        {
          text: "💎 Join VIP",
          web_app: { url: await getTelegramMiniAppUrl("vip", miniAppOptions) },
        },
      ],
    ],
  };
}

export async function sendTelegramMessage(payload: TelegramSendMessagePayload) {
  const token = await getTelegramBotToken();
  return sendTelegramMessageWithToken(token, payload);
}

export async function sendTelegramMessageWithToken(
  token: string,
  payload: TelegramSendMessagePayload,
) {
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

export async function isTelegramWebhookAuthorized(secretHeader: string | null) {
  const expected = (await getTelegramSettings()).webhookSecret?.trim();

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
    referralCode: parseTelegramReferralCode(text),
  };
}

export async function buildTelegramWebhookUrlPreview() {
  const settings = await getAppSettings();
  return absoluteUrlFromSiteUrl(settings.site.url, "/api/telegram/webhook");
}

function parseTelegramReferralCode(text: string) {
  const match = text.match(/^\/start(?:@\w+)?\s+ref_([A-Z0-9]+)$/i);
  return match?.[1]?.trim().toUpperCase() ?? null;
}
