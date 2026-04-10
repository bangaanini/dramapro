const MEDIA_PROXY_PATH = "/api/media";

export function buildMediaProxyUrl(url: string) {
  return `${MEDIA_PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

export function shouldProxyMediaUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname.includes("mydramawave.com") ||
      parsedUrl.hostname.includes("static-v1.mydramawave.com") ||
      parsedUrl.hostname.includes("video-v5.mydramawave.com") ||
      parsedUrl.hostname.includes("video-v6.mydramawave.com") ||
      parsedUrl.hostname.includes("dramaboxdb.com")
    );
  } catch {
    return false;
  }
}
