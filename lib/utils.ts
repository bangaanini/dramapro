import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const UNOPTIMIZED_IMAGE_HOSTS = new Set(["awscover.netshort.com"]);
const PROVIDER_LABELS: Record<string, string> = {
  melolo: "Melolo",
  meloshort: "MeloShort",
  goodshort: "GoodShort",
  dramawave: "DramaWave",
  dramabox: "DramaBox",
  reelshort: "ReelShort",
  freereels: "FreeReels",
  flickreels: "FlickReels",
  netshort: "NetShort",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    return UNOPTIMIZED_IMAGE_HOSTS.has(
      new URL(normalizeDisplayImageUrl(imageUrl)).hostname,
    );
  } catch {
    return false;
  }
}

export function formatProviderName(providerName: string) {
  return PROVIDER_LABELS[providerName] ?? providerName;
}
