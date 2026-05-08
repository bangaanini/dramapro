import { NextRequest, NextResponse } from "next/server";

import {
  ANALYTICS_VISITOR_COOKIE,
  ANALYTICS_VISITOR_COOKIE_MAX_AGE,
  createAnalyticsVisitorToken,
  isValidAnalyticsVisitorToken,
  normalizeAnalyticsSource,
  recordAnalyticsEvent,
  type AnalyticsEventType,
} from "@/lib/analytics/server";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalyticsEventPayload = {
  type?: unknown;
  source?: unknown;
  path?: unknown;
  internalDramaId?: unknown;
  episodeIndex?: unknown;
  partnerBotUsername?: unknown;
  meta?: unknown;
};

const VALID_EVENT_TYPES = new Set<AnalyticsEventType>([
  "page_view",
  "video_play",
  "heartbeat",
]);

function normalizeEventType(value: unknown): AnalyticsEventType | null {
  if (typeof value !== "string") {
    return null;
  }

  return VALID_EVENT_TYPES.has(value as AnalyticsEventType)
    ? (value as AnalyticsEventType)
    : null;
}

function normalizeEpisodeIndex(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeMeta(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value).filter(([, entryValue]) =>
    ["boolean", "number", "string"].includes(typeof entryValue) ||
    entryValue === null,
  );

  return Object.fromEntries(entries.slice(0, 20));
}

export async function POST(request: NextRequest) {
  let body: AnalyticsEventPayload;

  try {
    body = (await request.json()) as AnalyticsEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const type = normalizeEventType(body.type);

  if (!type) {
    return NextResponse.json(
      { error: "Invalid analytics event type." },
      { status: 400 },
    );
  }

  const existingVisitorToken =
    request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value ?? null;
  const visitorToken = isValidAnalyticsVisitorToken(existingVisitorToken) && existingVisitorToken
    ? existingVisitorToken
    : createAnalyticsVisitorToken();
  const shouldSetVisitorCookie = visitorToken !== existingVisitorToken;
  const user = await getUserFromRequest(request);
  const path = typeof body.path === "string" ? body.path : "/";
  const internalDramaId =
    typeof body.internalDramaId === "string" ? body.internalDramaId : null;
  const partnerBotUsername =
    typeof body.partnerBotUsername === "string"
      ? body.partnerBotUsername
      : null;

  await recordAnalyticsEvent({
    visitorToken,
    type,
    source: normalizeAnalyticsSource(body.source),
    path,
    user,
    headers: request.headers,
    internalDramaId,
    partnerBotUsername,
    episodeIndex: normalizeEpisodeIndex(body.episodeIndex),
    meta: normalizeMeta(body.meta),
  });

  const response = NextResponse.json({ ok: true });

  if (shouldSetVisitorCookie) {
    response.cookies.set(ANALYTICS_VISITOR_COOKIE, visitorToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ANALYTICS_VISITOR_COOKIE_MAX_AGE,
    });
  }

  return response;
}
