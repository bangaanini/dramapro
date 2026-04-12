import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_NAME,
  DEFAULT_SITE_TITLE,
  FALLBACK_SITE_URL,
  absoluteUrlFromSiteUrl,
  getSeoSettings,
  normalizeSiteUrl,
} from "@/lib/app-settings";

export const SITE_NAME = DEFAULT_SITE_NAME;
export const SITE_TITLE = DEFAULT_SITE_TITLE;
export const SITE_DESCRIPTION = DEFAULT_SITE_DESCRIPTION;
export { DEFAULT_OG_IMAGE };

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL);
}

export function absoluteUrl(path = "/") {
  return absoluteUrlFromSiteUrl(getSiteUrl(), path);
}

export async function getResolvedSiteUrl() {
  return (await getSeoSettings()).url;
}

export async function absoluteResolvedUrl(path = "/") {
  return absoluteUrlFromSiteUrl(await getResolvedSiteUrl(), path);
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
