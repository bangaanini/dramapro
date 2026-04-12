import { cache } from "react";

import { absoluteUrlFromSiteUrl, getAppSettings } from "@/lib/app-settings";
import { decryptPaymentSecret } from "@/lib/payment-crypto";
import { prisma } from "@/lib/prisma";

export function normalizeTelegramBotUsername(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

export const getEnabledTelegramPartnerBot = cache(
  async (botUsername: string | null | undefined) => {
    const normalized = normalizeTelegramBotUsername(botUsername);

    if (!normalized) {
      return null;
    }

    const row = await prisma.telegramPartnerBot.findUnique({
      where: {
        botUsername: normalized,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            authProvider: true,
            telegramUsername: true,
            affiliateCode: true,
          },
        },
      },
    });

    if (!row?.isEnabled) {
      return null;
    }

    const botToken = decryptPaymentSecret(row.botTokenCiphertext)?.trim();
    const webhookSecret = decryptPaymentSecret(
      row.webhookSecretCiphertext,
    )?.trim();

    if (!botToken) {
      return null;
    }

    return {
      ...row,
      botToken,
      webhookSecret: webhookSecret || null,
    };
  },
);

export async function getTelegramPartnerBotAdminRows() {
  const [settings, rows] = await Promise.all([
    getAppSettings(),
    prisma.telegramPartnerBot.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            authProvider: true,
            telegramUsername: true,
            affiliateCode: true,
          },
        },
      },
    }),
  ]);

  return rows.map((row) => {
    let botToken: string | null = null;
    let webhookSecret: string | null = null;
    let credentialError: string | null = null;

    try {
      botToken = decryptPaymentSecret(row.botTokenCiphertext)?.trim() || null;
    } catch (error) {
      credentialError =
        error instanceof Error ? error.message : "Token gagal didekripsi.";
    }

    try {
      webhookSecret =
        decryptPaymentSecret(row.webhookSecretCiphertext)?.trim() || null;
    } catch (error) {
      credentialError =
        error instanceof Error
          ? error.message
          : "Webhook secret gagal didekripsi.";
    }

    return {
      ...row,
      botToken,
      webhookSecret,
      credentialError,
      miniAppUrl: buildPartnerMiniAppUrlFromSiteUrl(
        settings.telegram.miniAppUrl || settings.site.url,
        row.botUsername,
      ),
      webhookUrl: buildPartnerWebhookUrlFromSiteUrl(
        settings.site.url,
        row.botUsername,
      ),
    };
  });
}

export async function buildPartnerMiniAppUrl(
  botUsername: string,
  target?: string | null,
) {
  const settings = await getAppSettings();
  return buildPartnerMiniAppUrlFromSiteUrl(
    settings.telegram.miniAppUrl || settings.site.url,
    botUsername,
    target,
  );
}

export async function buildPartnerWebhookUrl(botUsername: string) {
  const settings = await getAppSettings();
  return buildPartnerWebhookUrlFromSiteUrl(settings.site.url, botUsername);
}

function buildPartnerMiniAppUrlFromSiteUrl(
  siteUrl: string,
  botUsername: string,
  target?: string | null,
) {
  const url = new URL("/", siteUrl);
  url.searchParams.set("tg_bot", normalizeTelegramBotUsername(botUsername));

  if (target) {
    url.searchParams.set("tg_target", target);
  }

  return url.toString();
}

function buildPartnerWebhookUrlFromSiteUrl(siteUrl: string, botUsername: string) {
  return absoluteUrlFromSiteUrl(
    siteUrl,
    `/api/telegram/webhook/partner/${normalizeTelegramBotUsername(botUsername)}`,
  );
}
