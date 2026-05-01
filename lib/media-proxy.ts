const MEDIA_PROXY_PATH = "/api/media";

export function buildMediaProxyUrl(url: string) {
  return `${MEDIA_PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

export function shouldProxyMediaUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();
    const search = parsedUrl.search.toLowerCase();
    const isHlsUrl =
      pathname.includes(".m3u8") ||
      pathname.includes("m3u8") ||
      search.includes("m3u8");
    const isSubtitleUrl =
      pathname.endsWith(".srt") ||
      pathname.endsWith(".vtt") ||
      pathname.includes("/subtitle") ||
      search.includes("subtitle");

    return (
      isHlsUrl ||
      isSubtitleUrl ||
      (hostname === "api.dracinku.site" && pathname.includes("/aliplay/")) ||
      hostname.endsWith("jowo.tv") ||
      hostname.includes("mydramawave.com") ||
      hostname.includes("static-v1.mydramawave.com") ||
      hostname.includes("video-v5.mydramawave.com") ||
      hostname.includes("video-v6.mydramawave.com") ||
      hostname.includes("dramaboxdb.com") ||
      hostname.endsWith("dramahub.cc") ||
      hostname.endsWith("dramahub.me") ||
      hostname.endsWith("goodreels.com") ||
      hostname.endsWith("goodshort.com") ||
      hostname.endsWith("shorten.watch") ||
      hostname === "akamai-static.shorttv.live"
    );
  } catch {
    return false;
  }
}
