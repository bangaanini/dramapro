import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { decryptPaymentSecret } from "@/lib/payment-crypto";

export const FALLBACK_SITE_URL = "https://layardrama.id";
export const DEFAULT_SITE_NAME = "Layar Drama";
export const DEFAULT_SITE_TAGLINE = "Nonton short drama sub Indo fresh setiap hari";
export const DEFAULT_SITE_TITLE = `${DEFAULT_SITE_NAME} - ${DEFAULT_SITE_TAGLINE}`;
export const DEFAULT_SITE_DESCRIPTION =
  "Nonton ribuan short drama dalam 1 platform. Short drama terbaru dari berbagai sumber cepat dan aman.";
export const DEFAULT_SITE_LOGO = "/site-logo.jpg";
export const DEFAULT_OG_IMAGE = "/opengraph.jpg";
export const DEFAULT_TELEGRAM_DRAMA_CHANNEL_URL = "https://t.me/LayarDramaID";
export const DEFAULT_TELEGRAM_MOVIE_CHANNEL_URL = "https://t.me/layarboxoffice";
export const DEFAULT_TELEGRAM_WELCOME_MESSAGE = [
  "👋 Hai {name}! Selamat datang di {botName}",
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

export type TelegramInlineButtonConfig = {
  enabled: boolean;
  id: string;
  label: string;
  url: string;
};

const TELEGRAM_INLINE_BUTTON_SLOT_IDS = Array.from(
  { length: 10 },
  (_, index) => `button${index + 1}`,
);

const LEGACY_INLINE_BUTTON_FIELD_MAP = [
  ["openButtonText", "openButtonUrl"],
  ["searchButtonText", "searchButtonUrl"],
  ["affiliateButtonText", "affiliateButtonUrl"],
  ["dramaChannelButtonText", "dramaChannelUrl"],
  ["movieChannelButtonText", "movieChannelUrl"],
  ["supportButtonText", "supportButtonUrl"],
  ["vipButtonText", "vipButtonUrl"],
] as const;

function readTrimmed(value?: string | null) {
  return value?.trim() ?? "";
}

function createEmptyInlineButton(index: number): TelegramInlineButtonConfig {
  return {
    enabled: false,
    id: TELEGRAM_INLINE_BUTTON_SLOT_IDS[index] ?? `button${index + 1}`,
    label: "",
    url: "",
  };
}

export function buildLegacyTelegramInlineButtons(
  menu: {
    affiliateButtonText: string;
    affiliateButtonUrl: string;
    dramaChannelButtonText: string;
    dramaChannelUrl: string;
    movieChannelButtonText: string;
    movieChannelUrl: string;
    openButtonText: string;
    openButtonUrl: string;
    searchButtonText: string;
    searchButtonUrl: string;
    supportButtonText: string;
    supportButtonUrl: string;
    vipButtonText: string;
    vipButtonUrl: string;
  },
) {
  return TELEGRAM_INLINE_BUTTON_SLOT_IDS.map((buttonId, index) => {
    const fieldMap = LEGACY_INLINE_BUTTON_FIELD_MAP[index];

    if (!fieldMap) {
      return createEmptyInlineButton(index);
    }

    const [labelKey, urlKey] = fieldMap;
    const label = menu[labelKey]?.trim() ?? "";
    const url = menu[urlKey]?.trim() ?? "";

    return {
      enabled: Boolean(label && url),
      id: buttonId,
      label,
      url,
    };
  });
}

function normalizeTelegramInlineButtons(
  value: unknown,
  fallbackButtons: TelegramInlineButtonConfig[],
) {
  if (!Array.isArray(value)) {
    return fallbackButtons;
  }

  return TELEGRAM_INLINE_BUTTON_SLOT_IDS.map((buttonId, index) => {
    const fallback = fallbackButtons[index] ?? createEmptyInlineButton(index);
    const rawButton = value[index];

    if (!rawButton || typeof rawButton !== "object" || Array.isArray(rawButton)) {
      return fallback;
    }

    const input = rawButton as Record<string, unknown>;
    const label =
      typeof input.label === "string" ? input.label.trim() : fallback.label;
    const url = typeof input.url === "string" ? input.url.trim() : fallback.url;
    const hasContent = Boolean(label && url);

    return {
      enabled:
        typeof input.enabled === "boolean"
          ? input.enabled && hasContent
          : fallback.enabled && hasContent,
      id:
        typeof input.id === "string" && input.id.trim()
          ? input.id.trim()
          : buttonId,
      label,
      url,
    };
  });
}

export function normalizeSiteUrl(rawUrl?: string | null) {
  const value = readTrimmed(rawUrl);

  if (!value) {
    return FALLBACK_SITE_URL;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export function absoluteUrlFromSiteUrl(siteUrl: string, path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const resolvedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(resolvedPath, siteUrl).toString();
}

const getRawAppSettingsRecord = cache(async () => {
  try {
    return await prisma.appSettings.findUnique({
      where: { id: "global" },
    });
  } catch {
    return null;
  }
});

export const getAppSettings = cache(async () => {
  const row = await getRawAppSettingsRecord();

  const siteUrl = normalizeSiteUrl(
    row?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL,
  );
  const siteName = readTrimmed(row?.siteName) || DEFAULT_SITE_NAME;
  const siteDescription =
    readTrimmed(row?.siteDescription) || DEFAULT_SITE_DESCRIPTION;
  const siteLogoUrl = readTrimmed(row?.siteLogoUrl) || DEFAULT_SITE_LOGO;
  const telegramBotUsername =
    (readTrimmed(row?.telegramBotUsername) ||
      readTrimmed(process.env.TELEGRAM_BOT_USERNAME)
    ).replace(/^@/, "") || null;

  let telegramBotToken =
    readTrimmed(process.env.TELEGRAM_BOT_TOKEN) || null;
  let telegramWebhookSecret =
    readTrimmed(process.env.TELEGRAM_WEBHOOK_SECRET) || null;

  try {
    if (row?.telegramBotTokenCiphertext) {
      telegramBotToken = decryptPaymentSecret(row.telegramBotTokenCiphertext);
    }
  } catch {
    telegramBotToken = null;
  }

  try {
    if (row?.telegramWebhookSecretCiphertext) {
      telegramWebhookSecret = decryptPaymentSecret(
        row.telegramWebhookSecretCiphertext,
      );
    }
  } catch {
    telegramWebhookSecret = null;
  }

  const telegramSupportUrl =
    readTrimmed(row?.telegramSupportUrl) ||
    readTrimmed(process.env.TELEGRAM_SUPPORT_URL) ||
    (telegramBotUsername ? `https://t.me/${telegramBotUsername}` : siteUrl);
  const telegramMiniAppUrl = normalizeSiteUrl(
    row?.telegramMiniAppUrl || process.env.TELEGRAM_MINI_APP_URL || siteUrl,
  );
  const telegramDefaultBroadcastChannel = readTrimmed(
    row?.telegramDefaultBroadcastChannel,
  );
  const telegramBoxOfficeBotUrl = readTrimmed(
    row?.telegramBoxOfficeBotUrl,
  );
  const telegramMenu = {
    welcomeMessage:
      readTrimmed(row?.telegramWelcomeMessage) ||
      DEFAULT_TELEGRAM_WELCOME_MESSAGE,
    openButtonText: readTrimmed(row?.telegramOpenButtonText) || "🎬 Buka",
    openButtonUrl: readTrimmed(row?.telegramOpenButtonUrl),
    searchButtonText:
      readTrimmed(row?.telegramSearchButtonText) || "🔍 Cari Judul",
    searchButtonUrl: readTrimmed(row?.telegramSearchButtonUrl),
    affiliateButtonText:
      readTrimmed(row?.telegramAffiliateButtonText) || "💰 Gabung Affiliate",
    affiliateButtonUrl: readTrimmed(row?.telegramAffiliateButtonUrl),
    dramaChannelButtonText:
      readTrimmed(row?.telegramDramaChannelButtonText) || "🏠 Channel Drama",
    dramaChannelUrl:
      readTrimmed(row?.telegramDramaChannelUrl) ||
      DEFAULT_TELEGRAM_DRAMA_CHANNEL_URL,
    movieChannelButtonText:
      readTrimmed(row?.telegramMovieChannelButtonText) || "🎥 Channel Movie",
    movieChannelUrl:
      readTrimmed(row?.telegramMovieChannelUrl) ||
      DEFAULT_TELEGRAM_MOVIE_CHANNEL_URL,
    supportButtonText:
      readTrimmed(row?.telegramSupportButtonText) || "📞 Hubungi Admin",
    supportButtonUrl: readTrimmed(row?.telegramSupportButtonUrl) || telegramSupportUrl,
    vipButtonText: readTrimmed(row?.telegramVipButtonText) || "💎 Join VIP",
    vipButtonUrl: readTrimmed(row?.telegramVipButtonUrl),
  };
  const telegramButtonFallbackMenu = {
    ...telegramMenu,
    affiliateButtonUrl:
      telegramMenu.affiliateButtonUrl ||
      absoluteUrlFromSiteUrl(telegramMiniAppUrl, "/affiliate"),
    openButtonUrl:
      telegramMenu.openButtonUrl || absoluteUrlFromSiteUrl(telegramMiniAppUrl, "/"),
    searchButtonUrl:
      telegramMenu.searchButtonUrl ||
      absoluteUrlFromSiteUrl(telegramMiniAppUrl, "/search"),
    vipButtonUrl:
      telegramMenu.vipButtonUrl || absoluteUrlFromSiteUrl(telegramMiniAppUrl, "/vip"),
  };
  const telegramInlineButtons = normalizeTelegramInlineButtons(
    row?.telegramInlineButtons,
    buildLegacyTelegramInlineButtons(telegramButtonFallbackMenu),
  );

  return {
    raw: row,
    site: {
      url: siteUrl,
      name: siteName,
      title: `${siteName} - ${DEFAULT_SITE_TAGLINE}`,
      description: siteDescription,
      logoUrl: siteLogoUrl,
      ogImageUrl: DEFAULT_OG_IMAGE,
      customLogoUrl: readTrimmed(row?.siteLogoUrl) || DEFAULT_SITE_LOGO,
    },
    telegram: {
      botUsername: telegramBotUsername,
      botToken: telegramBotToken,
      webhookSecret: telegramWebhookSecret,
      supportUrl: telegramSupportUrl,
      miniAppUrl: telegramMiniAppUrl,
      defaultBroadcastChannel: telegramDefaultBroadcastChannel,
      boxOfficeBotUrl:
        telegramBoxOfficeBotUrl || telegramMenu.movieChannelUrl || "",
      inlineButtons: telegramInlineButtons,
      webhookUrl: absoluteUrlFromSiteUrl(siteUrl, "/api/telegram/webhook"),
      menu: telegramMenu,
    },
  };
});

export async function getSeoSettings() {
  return (await getAppSettings()).site;
}

export async function getTelegramSettings() {
  return (await getAppSettings()).telegram;
}
