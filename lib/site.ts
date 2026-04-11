const FALLBACK_SITE_URL = "https://dramapro.netlify.app";

export const SITE_NAME = "DramaPro";
export const SITE_TITLE = "DramaPro - Nonton short drama sub Indo fresh setiap hari";
export const SITE_DESCRIPTION =
  "Nonton ribuan short drama dalam 1 platform. Short drama terbaru dari berbagai sumber cepat dan aman.";
export const DEFAULT_OG_IMAGE = "/opengraph.jpg";

function normalizeSiteUrl(rawUrl?: string | null) {
  const value = rawUrl?.trim();

  if (!value) {
    return FALLBACK_SITE_URL;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function absoluteUrl(path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const resolvedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(resolvedPath, getSiteUrl()).toString();
}

export function toSeoDescription(
  value?: string | null,
  fallback = SITE_DESCRIPTION,
  maxLength = 160,
) {
  const normalized = (value ?? fallback).replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength - 1);
  const lastWhitespace = sliced.lastIndexOf(" ");
  const safeSlice = lastWhitespace > 80 ? sliced.slice(0, lastWhitespace) : sliced;

  return `${safeSlice.trimEnd()}...`;
}
