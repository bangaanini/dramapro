import { buildMediaProxyUrl, shouldProxyMediaUrl } from "@/lib/media-proxy";
import { prisma } from "@/lib/prisma";
import { ensureSeriesPlayableFresh } from "@/lib/catalog";
import { resolveProviderPlayback } from "@/lib/provider-sync";
import { isEpisodeVipLocked } from "@/lib/vip";

export type StreamResponse = {
  dramaId: string;
  provider: string;
  episodeIndex: number;
  defaultQuality: string | null;
  qualities: {
    label: string;
    url: string;
    mimeType: "application/x-mpegURL" | "video/mp4";
  }[];
  subtitles: {
    label: string;
    language: string;
    url: string;
  }[];
};

export class DramaStreamResolutionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DramaStreamResolutionError";
  }
}

type ResolveDramaStreamInput = {
  internalDramaId: string;
  episodeIndex: number;
  bypassVipLock?: boolean;
  vipLockFromEpisode?: number | null;
};

type StreamQuality = StreamResponse["qualities"][number];
type StreamSubtitle = StreamResponse["subtitles"][number];

function isLikelyHlsUrl(url: string) {
  const normalizedUrl = url.toLowerCase();

  return (
    normalizedUrl.includes(".m3u8") ||
    normalizedUrl.includes("m3u8") ||
    normalizedUrl.includes("mpegurl")
  );
}

function unwrapMediaProxyUrl(url: string) {
  try {
    const parsedUrl = new URL(url, "http://localhost");
    return parsedUrl.pathname === "/api/media"
      ? parsedUrl.searchParams.get("url") || url
      : url;
  } catch {
    return url;
  }
}

function decodeMaybeBase64Url(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    try {
      return Buffer.from(value, "base64").toString("utf8");
    } catch {
      return "";
    }
  }
}

function isUnavailableStreamUrl(url: string) {
  const sourceUrl = unwrapMediaProxyUrl(url);
  const normalizedUrl = sourceUrl.toLowerCase();

  if (
    normalizedUrl.includes("/image/not_found.mp4") ||
    normalizedUrl.includes("not_found.mp4") ||
    normalizedUrl.includes("404.mp4")
  ) {
    return true;
  }

  try {
    const parsedUrl = new URL(sourceUrl);
    const encodedPathPart = parsedUrl.pathname.split("/").at(-1) ?? "";
    const decoded = decodeMaybeBase64Url(encodedPathPart).trim().toLowerCase();

    return (
      parsedUrl.pathname.includes("/aliplay/") &&
      (decoded === "null" || decoded === "undefined" || decoded === "")
    );
  } catch {
    return false;
  }
}

function getStreamQualityLabel(quality: number | null) {
  return quality ? `${quality}p` : "Auto";
}

function buildStreamQuality(url: string, quality: number | null): StreamQuality {
  return {
    label: getStreamQualityLabel(quality),
    url: shouldProxyMediaUrl(url) ? buildMediaProxyUrl(url) : url,
    mimeType: isLikelyHlsUrl(url) ? "application/x-mpegURL" : "video/mp4",
  };
}

function buildAutoQuality(quality: StreamQuality): StreamQuality {
  return {
    ...quality,
    label: "Auto",
  };
}

function toProviderStreamQualities(sources: unknown[]): StreamQuality[] {
  return sources
    .map((source) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        return null;
      }

      const record = source as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url.trim() : "";
      if (!url || isUnavailableStreamUrl(url)) return null;

      const label =
        typeof record.quality === "string" && record.quality.trim()
          ? record.quality.trim()
          : "Auto";
      const normalizedMimeType =
        typeof record.mimeType === "string" ? record.mimeType.toLowerCase() : "";
      const mimeType =
        normalizedMimeType.includes("mpegurl")
          ? "application/x-mpegURL"
          : normalizedMimeType.includes("mp4")
            ? "video/mp4"
            : isLikelyHlsUrl(url)
              ? "application/x-mpegURL"
              : "video/mp4";

      return {
        label,
        url: shouldProxyMediaUrl(url) ? buildMediaProxyUrl(url) : url,
        mimeType,
      } satisfies StreamQuality;
    })
    .filter((item): item is StreamQuality => Boolean(item?.url));
}

function toProviderStreamSubtitles(subtitles: unknown[]): StreamSubtitle[] {
  return subtitles
    .map((subtitle) => {
      if (!subtitle || typeof subtitle !== "object" || Array.isArray(subtitle)) {
        return null;
      }

      const record = subtitle as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url.trim() : "";
      if (!url) return null;

      const language =
        typeof record.lang === "string" && record.lang.trim()
          ? record.lang.trim()
          : "unknown";
      const label =
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : language;

      return {
        label,
        language,
        url: shouldProxyMediaUrl(url) ? buildMediaProxyUrl(url) : url,
      } satisfies StreamSubtitle;
    })
    .filter((item): item is StreamSubtitle => Boolean(item?.url));
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function readTencentPathExpiry(url: URL): number | null {
  const hostname = url.hostname.toLowerCase();

  if (!hostname.endsWith("dramahue.com")) {
    return null;
  }

  const minExpirySeconds = Date.UTC(2024, 0, 1) / 1000;
  const maxExpirySeconds = Date.UTC(2038, 0, 1) / 1000;

  for (const segment of url.pathname.split("/")) {
    if (!/^[0-9a-f]{8}$/i.test(segment)) continue;

    const expiry = Number.parseInt(segment, 16);

    if (
      Number.isFinite(expiry) &&
      expiry >= minExpirySeconds &&
      expiry <= maxExpirySeconds
    ) {
      return expiry;
    }
  }

  return null;
}

function readSignedUrlExpiry(sourceUrl: string): number | null {
  try {
    const parsedUrl = new URL(sourceUrl);
    const readExpiryFromUrl = (url: URL) => {
      const directExpires = url.searchParams.get("Expires");

      if (directExpires) {
        const parsedExpires = Number.parseInt(directExpires, 10);
        return Number.isFinite(parsedExpires) ? parsedExpires : null;
      }

      const verify = url.searchParams.get("verify");
      const verifyExpires = Number.parseInt(verify?.split("-")[0] ?? "", 10);

      if (Number.isFinite(verifyExpires)) {
        return verifyExpires;
      }

      return readTencentPathExpiry(url);
    };

    const directExpiry = readExpiryFromUrl(parsedUrl);

    if (directExpiry) {
      return directExpiry;
    }

    const encodedUrl = parsedUrl.pathname.split("/").at(-1);

    if (!parsedUrl.pathname.includes("/aliplay/") || !encodedUrl) {
      return null;
    }

    const decodedUrl = decodeBase64Url(encodedUrl);
    return readExpiryFromUrl(new URL(decodedUrl));
  } catch {
    return null;
  }
}

function isSignedStreamUrlExpired(sourceUrl: string) {
  const expiresAtSeconds = readSignedUrlExpiry(sourceUrl);

  if (!expiresAtSeconds) {
    return false;
  }

  return expiresAtSeconds * 1000 <= Date.now() + 5 * 60 * 1000;
}

function buildAliplayUrlFromDecodedUrl(url: URL, decodedUrl: string) {
  const nextUrl = new URL(url.toString());
  const parts = nextUrl.pathname.split("/");
  parts[parts.length - 1] = encodeBase64Url(decodedUrl);
  nextUrl.pathname = parts.join("/");
  return nextUrl.toString();
}

function inferAdditionalHlsQualities(sourceUrl: string) {
  const inferred: StreamQuality[] = [];

  try {
    const parsedUrl = new URL(sourceUrl);
    const parts = parsedUrl.pathname.split("/");
    const encodedUrl = parts.at(-1);

    if (!parsedUrl.pathname.includes("/aliplay/dw-m3u8/") || !encodedUrl) {
      return inferred;
    }

    const decodedUrl = decodeBase64Url(encodedUrl);

    if (!decodedUrl.includes("akamai-static.shorttv.live") || !decodedUrl.includes("_720/")) {
      return inferred;
    }

    inferred.push(
      buildStreamQuality(
        buildAliplayUrlFromDecodedUrl(
          parsedUrl,
          decodedUrl.replace("_720/", "_480/"),
        ),
        480,
      ),
    );
  } catch {
    return inferred;
  }

  return inferred;
}

export async function resolveDramaStreamSources({
  internalDramaId,
  episodeIndex,
  bypassVipLock = false,
  vipLockFromEpisode = null,
}: ResolveDramaStreamInput) {
  let series = await ensureSeriesPlayableFresh(internalDramaId, {
    allowStaleOnFailure: true,
  });

  if (!series) {
    throw new DramaStreamResolutionError("Drama not found.", 404);
  }

  if (!Number.isInteger(episodeIndex) || episodeIndex < 1) {
    throw new DramaStreamResolutionError("Episode index is invalid.", 400);
  }

  if (
    !bypassVipLock &&
    isEpisodeVipLocked(episodeIndex, vipLockFromEpisode)
  ) {
    throw new DramaStreamResolutionError(
      `Episode VIP terkunci mulai EP.${vipLockFromEpisode}.`,
      403,
    );
  }

  let episode = series.episodes.find((item) => item.episodeIndex === episodeIndex);

  if (!episode) {
    series = await ensureSeriesPlayableFresh(internalDramaId, {
      force: true,
      hideOnFailure: true,
    });
    episode = series?.episodes.find((item) => item.episodeIndex === episodeIndex);
  }

  if (episode && (isUnavailableStreamUrl(episode.videoUrl) || isSignedStreamUrlExpired(episode.videoUrl))) {
    const refreshedSeries = await ensureSeriesPlayableFresh(internalDramaId, {
      force: true,
      hideOnFailure: true,
    });
    const refreshedEpisode = refreshedSeries?.episodes.find(
      (item) => item.episodeIndex === episodeIndex,
    );

    if (refreshedSeries && refreshedEpisode) {
      series = refreshedSeries;
      episode = refreshedEpisode;
    }
  }

  if (!series || !episode) {
    throw new DramaStreamResolutionError(
      "Requested episode is out of range.",
      400,
    );
  }

  const providerPlayback = await resolveProviderPlayback({
    seriesId: internalDramaId,
    episodeIndex,
  });

  if (providerPlayback) {
    const manualQualities = toProviderStreamQualities(providerPlayback.sources);

    if (!manualQualities.length) {
      throw new DramaStreamResolutionError(
        providerPlayback.status === "locked"
          ? "Episode terkunci dari provider."
          : "Stream episode belum tersedia.",
        providerPlayback.status === "locked" ? 403 : 502,
      );
    }

    const qualities = [buildAutoQuality(manualQualities[0]), ...manualQualities];

    return {
      drama: await prisma.catalogSeries.findUniqueOrThrow({
        where: { id: series.id },
        select: {
          id: true,
          title: true,
          platformId: true,
          upstreamSeriesId: true,
          chapterCount: true,
        },
      }),
      stream: {
        dramaId: series.id,
        provider: providerPlayback.provider,
        episodeIndex,
        defaultQuality: "Auto",
        qualities,
        subtitles: toProviderStreamSubtitles(providerPlayback.subtitles),
      },
    };
  }

  if (!episode.videoUrl || isUnavailableStreamUrl(episode.videoUrl)) {
    throw new DramaStreamResolutionError("Stream episode belum tersedia.", 502);
  }

  const primaryQuality = buildStreamQuality(
    episode.videoUrl,
    episode.quality ?? null,
  );
  const inferredQualities = inferAdditionalHlsQualities(episode.videoUrl);
  const manualQualities =
    series.platformId === "shortmax" && inferredQualities.length > 0
      ? [...inferredQualities, primaryQuality]
      : [primaryQuality, ...inferredQualities];
  const qualities =
    manualQualities.length > 0
      ? [buildAutoQuality(manualQualities[0]), ...manualQualities]
      : [];
  const subtitleEntries = Array.isArray(episode.subtitles)
    ? episode.subtitles
    : [];

  const stream: StreamResponse = {
    dramaId: series.id,
    provider: series.platformId,
    episodeIndex,
    defaultQuality: "Auto",
    qualities,
    subtitles: subtitleEntries
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }

        const language = typeof item.language === "string" ? item.language : "unknown";
        const displayName =
          typeof item.display_name === "string" ? item.display_name : language;
        const subtitleUrl =
          typeof item.subtitle === "string" ? item.subtitle : "";

        return subtitleUrl
          ? {
              label: displayName,
              language,
              url: shouldProxyMediaUrl(subtitleUrl)
                ? buildMediaProxyUrl(subtitleUrl)
                : subtitleUrl,
            }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          label: string;
          language: string;
          url: string;
        } => Boolean(item?.url),
      ),
  };

  return {
    drama: await prisma.catalogSeries.findUniqueOrThrow({
      where: { id: series.id },
      select: {
        id: true,
        title: true,
        platformId: true,
        upstreamSeriesId: true,
        chapterCount: true,
      },
    }),
    stream,
  };
}

export function toStreamErrorResponse(error: unknown) {
  if (error instanceof DramaStreamResolutionError) {
    return {
      status: error.status,
      body: {
        error: error.message,
      },
    };
  }

  return {
    status: 502,
    body: {
      error:
        error instanceof Error ? error.message : "Unexpected stream failure.",
    },
  };
}
