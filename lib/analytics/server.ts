import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeTelegramBotUsername } from "@/lib/telegram-partner-bots";
import type { PublicUser } from "@/lib/user-auth";

export const ANALYTICS_VISITOR_COOKIE = "dramapro_visitor";
export const ANALYTICS_VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

const ACTIVE_SESSION_WINDOW_MS = 1000 * 60 * 30;
const MAX_PATH_LENGTH = 512;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AnalyticsSource = "web" | "telegram";
export type AnalyticsEventType = "page_view" | "video_play" | "heartbeat";

type RecordAnalyticsEventInput = {
  visitorToken: string;
  type: AnalyticsEventType;
  source: AnalyticsSource;
  path: string;
  user: PublicUser | null;
  headers: Headers;
  internalDramaId?: string | null;
  episodeIndex?: number | null;
  partnerBotUsername?: string | null;
  meta?: Prisma.InputJsonValue | null;
};

type ParsedUserAgent = {
  deviceType: string;
  osName: string;
  browserName: string;
};

export function createAnalyticsVisitorToken() {
  return randomBytes(32).toString("base64url");
}

export function isValidAnalyticsVisitorToken(value: string | null | undefined) {
  return Boolean(value && /^[A-Za-z0-9_-]{32,128}$/u.test(value));
}

export function normalizeAnalyticsSource(value: unknown): AnalyticsSource {
  return value === "telegram" ? "telegram" : "web";
}

export function shouldTrackServerPath(path: string) {
  const normalized = path.trim() || "/";
  const cleanPath = normalized.split("?")[0] ?? normalized;

  if (
    cleanPath.startsWith("/admin") ||
    cleanPath.startsWith("/api") ||
    cleanPath.startsWith("/_next") ||
    cleanPath.startsWith("/favicon") ||
    cleanPath === "/robots.txt" ||
    cleanPath === "/sitemap.xml" ||
    cleanPath === "/manifest.webmanifest"
  ) {
    return false;
  }

  return !/\.(?:avif|css|gif|ico|jpeg|jpg|js|json|map|mp3|mp4|png|svg|txt|webmanifest|webp|woff2?)$/i.test(cleanPath);
}

function hashVisitorToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePath(value: string) {
  const trimmed = value.trim() || "/";
  return trimmed.length > MAX_PATH_LENGTH
    ? trimmed.slice(0, MAX_PATH_LENGTH)
    : trimmed;
}

function normalizeTextDimension(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._ -]+/gu, "");
  return normalized || "unknown";
}

function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent.toLowerCase();
  const deviceType = /ipad|tablet|kindle|silk/u.test(ua)
    ? "tablet"
    : /android|iphone|ipod|mobile|windows phone/u.test(ua)
      ? "mobile"
      : userAgent
        ? "desktop"
        : "unknown";

  let osName = "unknown";
  if (/android/u.test(ua)) osName = "android";
  else if (/iphone|ipad|ipod/u.test(ua)) osName = "ios";
  else if (/windows/u.test(ua)) osName = "windows";
  else if (/mac os|macintosh/u.test(ua)) osName = "macos";
  else if (/linux/u.test(ua)) osName = "linux";

  let browserName = "unknown";
  if (/telegram/u.test(ua)) browserName = "telegram";
  else if (/edg\//u.test(ua)) browserName = "edge";
  else if (/opr\/|opera/u.test(ua)) browserName = "opera";
  else if (/firefox|fxios/u.test(ua)) browserName = "firefox";
  else if (/crios|chrome|chromium/u.test(ua)) browserName = "chrome";
  else if (/safari/u.test(ua)) browserName = "safari";

  return {
    deviceType,
    osName,
    browserName,
  };
}

function readCountryCode(headers: Headers) {
  const candidates = [
    headers.get("cf-ipcountry"),
    headers.get("cf-iploc-country"),
    headers.get("x-country-code"),
    headers.get("x-vercel-ip-country"),
    headers.get("x-geo-country"),
    headers.get("cloudfront-viewer-country"),
  ];

  for (const candidate of candidates) {
    const normalized = candidate?.trim().toUpperCase();

    if (normalized && /^[A-Z]{2}$/u.test(normalized) && normalized !== "XX") {
      return normalized;
    }
  }

  return "unknown";
}

async function resolveSeriesId(internalDramaId: string | null | undefined) {
  const normalized = internalDramaId?.trim() ?? "";

  if (!UUID_PATTERN.test(normalized)) {
    return null;
  }

  const series = await prisma.catalogSeries.findUnique({
    where: {
      id: normalized,
    },
    select: {
      id: true,
    },
  });

  return series?.id ?? null;
}

async function resolvePartnerBotId(input: RecordAnalyticsEventInput) {
  const normalizedBotUsername = normalizeTelegramBotUsername(
    input.partnerBotUsername,
  );

  if (normalizedBotUsername) {
    const partnerBot = await prisma.telegramPartnerBot.findUnique({
      where: {
        botUsername: normalizedBotUsername,
      },
      select: {
        id: true,
        isEnabled: true,
      },
    });

    if (partnerBot?.isEnabled) {
      return partnerBot.id;
    }
  }

  return input.user?.referredByPartnerBotId ?? null;
}

async function resolveAnalyticsContext(input: RecordAnalyticsEventInput) {
  const now = new Date();
  const tokenHash = hashVisitorToken(input.visitorToken);
  const userId = input.user?.id ?? null;
  const partnerBotId = await resolvePartnerBotId(input);
  const userAgent = input.headers.get("user-agent") ?? "";
  const parsedUserAgent = parseUserAgent(userAgent);
  const source =
    input.user?.authProvider === "telegram" ? "telegram" : input.source;

  const visitor = await prisma.analyticsVisitor.upsert({
    where: {
      tokenHash,
    },
    create: {
      tokenHash,
      userId,
      firstSource: source,
      lastSource: source,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      userId: userId ?? undefined,
      lastSource: source,
      lastSeenAt: now,
    },
    select: {
      id: true,
    },
  });

  const activeSince = new Date(now.getTime() - ACTIVE_SESSION_WINDOW_MS);
  const activeSession = await prisma.analyticsSession.findFirst({
    where: {
      visitorId: visitor.id,
      partnerBotId,
      source,
      lastSeenAt: {
        gte: activeSince,
      },
    },
    orderBy: {
      lastSeenAt: "desc",
    },
    select: {
      id: true,
      countryCode: true,
      deviceType: true,
      osName: true,
      browserName: true,
    },
  });

  if (activeSession) {
    const countryCode = readCountryCode(input.headers);
    const session = await prisma.analyticsSession.update({
      where: {
        id: activeSession.id,
      },
      data: {
        userId: userId ?? undefined,
        partnerBotId,
        lastSeenAt: now,
        countryCode:
          activeSession.countryCode === "unknown" && countryCode !== "unknown"
            ? countryCode
            : undefined,
        deviceType:
          activeSession.deviceType === "unknown" &&
          parsedUserAgent.deviceType !== "unknown"
            ? parsedUserAgent.deviceType
            : undefined,
        osName:
          activeSession.osName === "unknown" &&
          parsedUserAgent.osName !== "unknown"
            ? parsedUserAgent.osName
            : undefined,
        browserName:
          activeSession.browserName === "unknown" &&
          parsedUserAgent.browserName !== "unknown"
            ? parsedUserAgent.browserName
            : undefined,
      },
      select: {
        id: true,
      },
    });

    return {
      now,
      source,
      visitorId: visitor.id,
      sessionId: session.id,
      userId,
      partnerBotId,
    };
  }

  const previousSession = await prisma.analyticsSession.findFirst({
    where: {
      visitorId: visitor.id,
    },
    select: {
      id: true,
    },
  });

  const session = await prisma.analyticsSession.create({
    data: {
      visitorId: visitor.id,
      userId,
      partnerBotId,
      source,
      deviceType: parsedUserAgent.deviceType,
      osName: parsedUserAgent.osName,
      browserName: parsedUserAgent.browserName,
      countryCode: readCountryCode(input.headers),
      isReturning: Boolean(previousSession),
      startedAt: now,
      lastSeenAt: now,
    },
    select: {
      id: true,
    },
  });

  return {
    now,
    source,
    visitorId: visitor.id,
    sessionId: session.id,
    userId,
    partnerBotId,
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput) {
  if (!shouldTrackServerPath(input.path)) {
    return {
      ok: true,
      skipped: true,
    };
  }

  const context = await resolveAnalyticsContext(input);
  const path = normalizePath(input.path);

  if (input.type === "heartbeat") {
    await prisma.analyticsSession.update({
      where: {
        id: context.sessionId,
      },
      data: {
        heartbeatCount: {
          increment: 1,
        },
        lastSeenAt: context.now,
      },
    });

    return {
      ok: true,
      skipped: false,
    };
  }

  const seriesId =
    input.type === "video_play"
      ? await resolveSeriesId(input.internalDramaId)
      : null;
  const episodeIndex =
    typeof input.episodeIndex === "number" && Number.isFinite(input.episodeIndex)
      ? Math.max(1, Math.floor(input.episodeIndex))
      : null;
  const dedupeKey =
    input.type === "video_play" && seriesId && episodeIndex
      ? `video:${context.sessionId}:${seriesId}:${episodeIndex}`
      : null;

  let createdEvent = true;

  try {
    await prisma.analyticsEvent.create({
      data: {
        dedupeKey,
        visitorId: context.visitorId,
        sessionId: context.sessionId,
        userId: context.userId,
        partnerBotId: context.partnerBotId,
        seriesId,
        type: normalizeTextDimension(input.type),
        source: context.source,
        path,
        episodeIndex,
        meta: input.meta ?? undefined,
        occurredAt: context.now,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    createdEvent = false;
  }

  if (createdEvent) {
    await prisma.analyticsSession.update({
      where: {
        id: context.sessionId,
      },
      data: {
        lastSeenAt: context.now,
        ...(input.type === "video_play"
          ? {
              videoPlayCount: {
                increment: 1,
              },
            }
          : {
              pageViewCount: {
                increment: 1,
              },
            }),
      },
    });
  }

  return {
    ok: true,
    skipped: false,
    createdEvent,
  };
}
