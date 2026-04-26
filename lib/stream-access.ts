import { buildMediaProxyUrl, shouldProxyMediaUrl } from "@/lib/media-proxy";
import { prisma } from "@/lib/prisma";
import { ensureSeriesPlayableFresh } from "@/lib/catalog";
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

function isLikelyHlsUrl(url: string) {
  const normalizedUrl = url.toLowerCase();

  return (
    normalizedUrl.includes(".m3u8") ||
    normalizedUrl.includes("m3u8") ||
    normalizedUrl.includes("mpegurl")
  );
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

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
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

      return Number.isFinite(verifyExpires) ? verifyExpires : null;
    };

    const directExpiry = readExpiryFromUrl(parsedUrl);

    if (directExpiry) {
      return directExpiry;
    }

    const encodedUrl = parsedUrl.pathname.split("/").at(-1);

    if (
      parsedUrl.hostname !== "api.dracinku.site" ||
      !parsedUrl.pathname.includes("/aliplay/") ||
      !encodedUrl
    ) {
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

    if (
      parsedUrl.hostname !== "api.dracinku.site" ||
      !parsedUrl.pathname.includes("/aliplay/dw-m3u8/") ||
      !encodedUrl
    ) {
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

  if (episode && isSignedStreamUrlExpired(episode.videoUrl)) {
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
