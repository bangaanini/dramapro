import {
  absoluteUrlFromSiteUrl,
  getAppSettings,
  getTelegramSettings,
  type TelegramInlineButtonConfig,
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
  chat_id: number | string;
  text: string;
  reply_markup?: {
    inline_keyboard: TelegramInlineKeyboardButton[][];
  };
};

type TelegramSendPhotoPayload = {
  chat_id: number | string;
  photo: string;
  caption?: string;
  caption_entities?: Array<{
    length: number;
    offset: number;
    type: "text_link";
    url: string;
  }>;
  reply_markup?: {
    inline_keyboard: TelegramInlineKeyboardButton[][];
  };
};

type TelegramPinChatMessagePayload = {
  chat_id: number | string;
  message_id: number;
  disable_notification?: boolean;
};

type TelegramWebhookMessage = {
  message?: {
    chat: {
      id: number;
    };
    text?: string;
    from?: {
      id?: number;
      first_name?: string;
      username?: string;
    };
  };
};

type TelegramMiniAppTarget = "home" | "search" | "vip" | "profile" | "affiliate";

const PARTNER_BOX_OFFICE_INLINE_BUTTON_INDEX = 4;

function sanitizeInlineButtonUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function shouldUseWebAppButton(miniAppUrl: string, urlValue: string) {
  try {
    return new URL(urlValue).origin === new URL(miniAppUrl).origin;
  } catch {
    return false;
  }
}

function appendMiniAppContext(
  urlValue: string,
  options: {
    botUsername?: string | null;
    referralCode?: string | null;
  },
) {
  try {
    const url = new URL(urlValue);
    const botUsername = normalizeTelegramBotUsername(options.botUsername);

    if (botUsername) {
      url.searchParams.set("tg_bot", botUsername);
    }

    if (options.referralCode?.trim()) {
      url.searchParams.set("tg_ref", options.referralCode.trim().toUpperCase());
    }

    return url.toString();
  } catch {
    return urlValue;
  }
}

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

  return buildTelegramMiniAppStartAppLinkForUsername(username, startParam);
}

export function buildTelegramMiniAppStartAppLinkForUsername(
  botUsername: string,
  startParam: string,
) {
  const normalizedUsername = botUsername.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    throw new Error("Telegram bot username belum diatur.");
  }

  return `https://t.me/${normalizedUsername}?startapp=${encodeURIComponent(startParam)}`;
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

export async function buildTelegramStartMessage(
  firstName?: string,
  options?: {
    botName?: string | null;
    botUsername?: string | null;
    welcomeMessage?: string | null;
  },
) {
  const safeName = firstName?.trim() || "Sobat Drama";
  const settings = await getAppSettings();
  const resolvedBotName =
    options?.botName?.trim() ||
    options?.botUsername?.trim().replace(/^@/, "") ||
    settings.telegram.botUsername?.trim().replace(/^@/, "") ||
    settings.site.name;

  return formatTelegramTemplate(
    options?.welcomeMessage?.trim() || settings.telegram.menu.welcomeMessage,
    {
      botName: resolvedBotName,
      name: safeName,
      siteName: settings.site.name,
    },
  );
}

export async function buildTelegramStartKeyboard(
  referralCode?: string | null,
  options?: {
    botUsername?: string | null;
    inlineButtons?: TelegramInlineButtonConfig[] | null;
    partnerBoxOfficeBotUrl?: string | null;
    isMainAdmin?: boolean;
  },
) {
  const settings = await getTelegramSettings();
  const inlineButtons = options?.inlineButtons ?? settings.inlineButtons;
  const partnerBoxOfficeBotUrl = sanitizeInlineButtonUrl(
    options?.partnerBoxOfficeBotUrl ?? "",
  );
  const miniAppOptions = {
    referralCode,
    botUsername: options?.botUsername,
  };
  const rows: TelegramInlineKeyboardButton[][] = [];

  for (let index = 0; index < inlineButtons.length; index += 2) {
    const row = inlineButtons
      .slice(index, index + 2)
      .filter((button) => button.enabled && button.label.trim() && button.url.trim())
      .map((button, offset) =>
        buildTelegramInlineButton(
          resolveTelegramStartInlineButton(
            button,
            index + offset,
            partnerBoxOfficeBotUrl,
          ),
          settings.miniAppUrl,
          miniAppOptions,
        ),
      )
      .filter((button): button is TelegramInlineKeyboardButton => button !== null);

    if (row.length) {
      rows.push(row);
    }
  }

  if (rows.length > 0) {
    if (options?.isMainAdmin) {
      rows.push([
        {
          text: "⚙️ Admin",
          web_app: {
            url: absoluteUrlFromSiteUrl(
              settings.miniAppUrl,
              "/admin/telegram-login",
            ),
          },
        },
      ]);
    }

    return {
      inline_keyboard: rows,
    };
  }

  const menu = settings.menu;
  const movieChannelUrl = partnerBoxOfficeBotUrl || menu.movieChannelUrl;

  return {
    inline_keyboard: [
      [
        await buildTelegramMenuButton(
          menu.openButtonText,
          menu.openButtonUrl,
          "home",
          miniAppOptions,
        ),
      ],
      [
        await buildTelegramMenuButton(
          menu.searchButtonText,
          menu.searchButtonUrl,
          "search",
          miniAppOptions,
        ),
      ],
      [
        await buildTelegramMenuButton(
          menu.affiliateButtonText,
          menu.affiliateButtonUrl,
          "affiliate",
          miniAppOptions,
        ),
      ],
      [
        { text: menu.dramaChannelButtonText, url: menu.dramaChannelUrl },
        { text: menu.movieChannelButtonText, url: movieChannelUrl },
      ],
      [
        { text: menu.supportButtonText, url: menu.supportButtonUrl },
        await buildTelegramMenuButton(
          menu.vipButtonText,
          menu.vipButtonUrl,
          "vip",
          miniAppOptions,
        ),
      ],
      ...(options?.isMainAdmin
        ? [
            [
              {
                text: "⚙️ Admin",
                web_app: {
                  url: absoluteUrlFromSiteUrl(
                    settings.miniAppUrl,
                    "/admin/telegram-login",
                  ),
                },
              },
            ],
          ]
        : []),
    ],
  };
}

function resolveTelegramStartInlineButton(
  button: TelegramInlineButtonConfig,
  index: number,
  partnerBoxOfficeBotUrl: string | null,
) {
  if (!partnerBoxOfficeBotUrl || index !== PARTNER_BOX_OFFICE_INLINE_BUTTON_INDEX) {
    return button;
  }

  return {
    ...button,
    url: partnerBoxOfficeBotUrl,
  };
}

function formatTelegramTemplate(
  template: string,
  values: {
    botName: string;
    name: string;
    siteName: string;
  },
) {
  return template
    .replaceAll("{botName}", values.botName)
    .replaceAll("{bot_name}", values.botName)
    .replaceAll("{nama bot}", values.botName)
    .replaceAll("{nama_bot}", values.botName)
    .replaceAll("{name}", values.name)
    .replaceAll("{siteName}", values.siteName);
}

async function buildTelegramMenuButton(
  text: string,
  customUrl: string,
  target: TelegramMiniAppTarget,
  options: {
    referralCode?: string | null;
    botUsername?: string | null;
  },
): Promise<TelegramInlineKeyboardButton> {
  if (customUrl) {
    return {
      text,
      url: customUrl,
    };
  }

  return {
    text,
    web_app: {
      url: await getTelegramMiniAppUrl(target, options),
    },
  };
}

function buildTelegramInlineButton(
  button: TelegramInlineButtonConfig,
  miniAppUrl: string,
  options: {
    botUsername?: string | null;
    referralCode?: string | null;
  },
): TelegramInlineKeyboardButton | null {
  const normalizedUrl = sanitizeInlineButtonUrl(button.url);

  if (!normalizedUrl) {
    return null;
  }

  if (shouldUseWebAppButton(miniAppUrl, normalizedUrl)) {
    return {
      text: button.label,
      web_app: {
        url: appendMiniAppContext(normalizedUrl, options),
      },
    };
  }

  return {
    text: button.label,
    url: normalizedUrl,
  };
}

export async function sendTelegramMessage(payload: TelegramSendMessagePayload) {
  const token = await getTelegramBotToken();
  return sendTelegramMessageWithToken(token, payload);
}

async function callTelegramBotApi<TPayload>(
  token: string,
  method: string,
  payload: TPayload,
) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");
  let parsed: { ok?: boolean; description?: string } | null = null;

  if (text.trim()) {
    try {
      parsed = JSON.parse(text) as { ok?: boolean; description?: string };
    } catch {
      parsed = null;
    }
  }

  if (!response.ok || parsed?.ok === false) {
    const detail = parsed?.description || text;
    throw new Error(`Telegram ${method} gagal: ${response.status} ${detail}`.trim());
  }

  return parsed;
}

export async function sendTelegramMessageWithToken(
  token: string,
  payload: TelegramSendMessagePayload,
) {
  return callTelegramBotApi(token, "sendMessage", payload);
}

export async function sendTelegramPhotoWithToken(
  token: string,
  payload: TelegramSendPhotoPayload,
) {
  return callTelegramBotApi(token, "sendPhoto", payload);
}

export async function pinTelegramChatMessageWithToken(
  token: string,
  payload: TelegramPinChatMessagePayload,
) {
  return callTelegramBotApi(token, "pinChatMessage", payload);
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
    telegramUserId:
      typeof update.message?.from?.id === "number"
        ? String(update.message.from.id)
        : null,
    telegramUsername: update.message?.from?.username?.trim() || null,
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
