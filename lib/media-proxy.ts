const MEDIA_PROXY_PATH = "/api/media";

export function buildMediaProxyUrl(url: string) {
  return `${MEDIA_PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

export function shouldProxyMediaUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    return (
      hostname.includes("mydramawave.com") ||
      hostname.includes("static-v1.mydramawave.com") ||
      hostname.includes("video-v5.mydramawave.com") ||
      hostname.includes("video-v6.mydramawave.com") ||
      hostname.includes("dramaboxdb.com") ||
      hostname.endsWith("goodreels.com") ||
      hostname.endsWith("goodshort.com")
    );
  } catch {
    return false;
  }
}
