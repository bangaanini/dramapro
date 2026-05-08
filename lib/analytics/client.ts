"use client";

import "@/lib/telegram-web-app";
import { safeSessionStorage } from "@/lib/safe-session-storage";

export type AnalyticsEventType = "page_view" | "video_play" | "heartbeat";

const ANALYTICS_PARTNER_BOT_KEY = "dramapro.analytics.partner_bot.v1";

type AnalyticsEventPayload = {
  type: AnalyticsEventType;
  path?: string;
  internalDramaId?: string;
  episodeIndex?: number;
  meta?: Record<string, string | number | boolean | null>;
};

const STATIC_PATH_EXTENSIONS =
  /\.(?:avif|css|gif|ico|jpeg|jpg|js|json|map|mp3|mp4|png|svg|txt|webmanifest|webp|woff2?)$/i;

export function shouldTrackAnalyticsPath(path: string) {
  const normalized = path.trim() || "/";

  if (
    normalized.startsWith("/admin") ||
    normalized.startsWith("/api") ||
    normalized.startsWith("/_next") ||
    normalized.startsWith("/favicon") ||
    normalized === "/robots.txt" ||
    normalized === "/sitemap.xml" ||
    normalized === "/manifest.webmanifest"
  ) {
    return false;
  }

  return !STATIC_PATH_EXTENSIONS.test(normalized.split("?")[0] ?? normalized);
}

function detectAnalyticsSource() {
  if (typeof window === "undefined") {
    return "web";
  }

  return window.Telegram?.WebApp?.initData?.trim() ? "telegram" : "web";
}

function normalizePartnerBotUsername(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

export function rememberAnalyticsPartnerBotUsername(
  value: string | null | undefined,
) {
  const normalized = normalizePartnerBotUsername(value);

  if (!normalized) {
    return null;
  }

  safeSessionStorage.setItem(ANALYTICS_PARTNER_BOT_KEY, normalized);
  return normalized;
}

function detectAnalyticsPartnerBotUsername() {
  if (typeof window === "undefined") {
    return null;
  }

  const fromUrl = rememberAnalyticsPartnerBotUsername(
    new URLSearchParams(window.location.search).get("tg_bot"),
  );

  if (fromUrl) {
    return fromUrl;
  }

  return normalizePartnerBotUsername(
    safeSessionStorage.getItem(ANALYTICS_PARTNER_BOT_KEY),
  );
}

export function trackAnalyticsEvent(payload: AnalyticsEventPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const path =
    payload.path ||
    `${window.location.pathname}${window.location.search || ""}`;

  if (!shouldTrackAnalyticsPath(path)) {
    return;
  }

  void fetch("/api/analytics/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
    keepalive: payload.type !== "page_view",
    body: JSON.stringify({
      ...payload,
      path,
      source: detectAnalyticsSource(),
      partnerBotUsername: detectAnalyticsPartnerBotUsername(),
      occurredAt: new Date().toISOString(),
    }),
  }).catch(() => undefined);
}
