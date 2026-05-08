import { NextRequest } from "next/server";

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function forwardedOrigin(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!host) {
    return null;
  }

  const proto =
    request.headers.get("x-forwarded-proto") ??
    (request.nextUrl.protocol ? request.nextUrl.protocol.replace(/:$/u, "") : "https");

  return normalizeOrigin(`${proto}://${host}`);
}

export function isTrustedSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return false;
  }

  const allowedOrigins = new Set(
    [
      request.nextUrl.origin,
      forwardedOrigin(request),
      normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
      normalizeOrigin(process.env.TELEGRAM_MINI_APP_URL),
    ].filter(Boolean),
  );

  return allowedOrigins.has(normalizedOrigin);
}
