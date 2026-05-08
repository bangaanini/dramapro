import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { CATALOG_PLATFORM_LABELS } from "@/lib/catalog-upstream";

const UNOPTIMIZED_IMAGE_HOSTS = new Set([
  "akamai-static.shorttv.live",
  "awscover.netshort.com",
  "hwztchapter.dramaboxdb.com",
  "hwztvideo.dramaboxdb.com",
  "image.fishnovel.com",
  "volcengine-forward.shorttv.live",
]);

const HIDDEN_DISPLAY_TAG_NAMES = new Set(["free", "gratis"]);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isVisibleDisplayTag(tag: string) {
  return !HIDDEN_DISPLAY_TAG_NAMES.has(tag.trim().toLowerCase());
}

export function filterVisibleDisplayTags(tags: string[]) {
  return tags.filter(isVisibleDisplayTag);
}

export function normalizeDisplayImageUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);

    if (
      url.hostname.endsWith(".fizzopic.org") &&
      url.pathname.startsWith("/novel-images-sg/") &&
      url.pathname.endsWith(".heic")
    ) {
      const match = url.hostname.match(/^(p\d+)-novel-sign-sg\.fizzopic\.org$/);
      const subdomain = match?.[1];

      if (!subdomain) {
        return imageUrl;
      }

      return `https://${subdomain}-novel-sg.ibyteimg.com/img${url.pathname.replace(/\.heic$/i, ".jpg")}`;
    }

    return imageUrl;
  } catch {
    return imageUrl;
  }
}

export function shouldBypassImageOptimization(imageUrl: string) {
  try {
    const url = new URL(normalizeDisplayImageUrl(imageUrl));
    const hostname = url.hostname;

    return (
      UNOPTIMIZED_IMAGE_HOSTS.has(hostname) ||
      hostname.endsWith(".dramaboxdb.com") ||
      hostname.endsWith(".shorttv.live") ||
      url.searchParams.has("auth_key")
    );
  } catch {
    return false;
  }
}

export function formatProviderName(providerName: string) {
  return CATALOG_PLATFORM_LABELS[providerName as keyof typeof CATALOG_PLATFORM_LABELS] ?? providerName;
}
