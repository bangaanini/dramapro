import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { decryptPaymentSecret } from "@/lib/payment-crypto";

export const FALLBACK_SITE_URL = "https://dramapro.netlify.app";
export const DEFAULT_SITE_NAME = "DramaPro";
export const DEFAULT_SITE_TAGLINE = "Nonton short drama sub Indo fresh setiap hari";
export const DEFAULT_SITE_TITLE = `${DEFAULT_SITE_NAME} - ${DEFAULT_SITE_TAGLINE}`;
export const DEFAULT_SITE_DESCRIPTION =
  "Nonton ribuan short drama dalam 1 platform. Short drama terbaru dari berbagai sumber cepat dan aman.";
export const DEFAULT_OG_IMAGE = "/opengraph.jpg";

function readTrimmed(value?: string | null) {
  return value?.trim() ?? "";
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
  const siteLogoUrl = readTrimmed(row?.siteLogoUrl) || DEFAULT_OG_IMAGE;
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

  return {
    raw: row,
    site: {
      url: siteUrl,
      name: siteName,
      title: `${siteName} - ${DEFAULT_SITE_TAGLINE}`,
      description: siteDescription,
      logoUrl: siteLogoUrl,
      customLogoUrl: readTrimmed(row?.siteLogoUrl) || null,
    },
    telegram: {
      botUsername: telegramBotUsername,
      botToken: telegramBotToken,
      webhookSecret: telegramWebhookSecret,
      supportUrl: telegramSupportUrl,
      miniAppUrl: telegramMiniAppUrl,
      webhookUrl: absoluteUrlFromSiteUrl(siteUrl, "/api/telegram/webhook"),
    },
  };
});

export async function getSeoSettings() {
  return (await getAppSettings()).site;
}

export async function getTelegramSettings() {
  return (await getAppSettings()).telegram;
}
