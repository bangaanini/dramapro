import { createHmac, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

const DOWNLOAD_EXPIRES_PARAM = "downloadExpires";
const DOWNLOAD_SIGNATURE_PARAM = "downloadSignature";
const DEFAULT_TOKEN_TTL_MINUTES = 60;

function getSigningSecret() {
  return (
    process.env.PROMO_DOWNLOAD_TOKEN_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    (process.env.NODE_ENV !== "production" ? "dev-promo-download-token" : "")
  );
}

function getTokenTtlMs() {
  const ttlMinutes = Number.parseInt(
    process.env.PROMO_DOWNLOAD_TOKEN_TTL_MINUTES?.trim() || "",
    10,
  );

  return (
    (Number.isInteger(ttlMinutes) && ttlMinutes > 0
      ? ttlMinutes
      : DEFAULT_TOKEN_TTL_MINUTES) *
    60 *
    1000
  );
}

function getCanonicalPayload(pathname: string, searchParams: URLSearchParams) {
  const entries = [...searchParams.entries()]
    .filter(([key]) => key !== DOWNLOAD_SIGNATURE_PARAM)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    });

  return `${pathname}\n${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&")}`;
}

function signPayload(pathname: string, searchParams: URLSearchParams) {
  const secret = getSigningSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret)
    .update(getCanonicalPayload(pathname, searchParams))
    .digest("base64url");
}

export function signPromoDownloadUrl(url: string) {
  const parsedUrl = new URL(url, "https://dramapro.local");
  const expiresAt = Date.now() + getTokenTtlMs();

  parsedUrl.searchParams.set(DOWNLOAD_EXPIRES_PARAM, String(expiresAt));
  parsedUrl.searchParams.delete(DOWNLOAD_SIGNATURE_PARAM);

  const signature = signPayload(parsedUrl.pathname, parsedUrl.searchParams);

  if (!signature) {
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  }

  parsedUrl.searchParams.set(DOWNLOAD_SIGNATURE_PARAM, signature);

  return `${parsedUrl.pathname}${parsedUrl.search}`;
}

export function isPromoDownloadSignedRequest(request: NextRequest) {
  const signature = request.nextUrl.searchParams
    .get(DOWNLOAD_SIGNATURE_PARAM)
    ?.trim();
  const expiresAt = Number.parseInt(
    request.nextUrl.searchParams.get(DOWNLOAD_EXPIRES_PARAM) || "",
    10,
  );

  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expectedSignature = signPayload(
    request.nextUrl.pathname,
    request.nextUrl.searchParams,
  );

  if (!expectedSignature || signature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
