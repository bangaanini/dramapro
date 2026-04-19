import { buildMediaProxyUrl, shouldProxyMediaUrl } from "@/lib/media-proxy";
import { prisma } from "@/lib/prisma";
import {
  getProviderPayloadError,
  isActiveProviderType,
  ProviderType,
  StreamResponse,
  UpstreamHttpError,
  fetchProviderJson,
  normalizeStreamPayload,
  resolveStreamRequest,
} from "@/lib/provider-adapter";
import { isEpisodeVipLocked } from "@/lib/vip";

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

export async function resolveDramaStreamSources({
  internalDramaId,
  episodeIndex,
  bypassVipLock = false,
  vipLockFromEpisode = null,
}: ResolveDramaStreamInput) {
  const drama = await prisma.drama.findUnique({
    where: { id: internalDramaId },
    select: {
      id: true,
      title: true,
      providerName: true,
      providerDramaId: true,
      episodeCount: true,
    },
  });

  if (!drama) {
    throw new DramaStreamResolutionError("Drama not found.", 404);
  }

  if (!Number.isInteger(episodeIndex) || episodeIndex < 1) {
    throw new DramaStreamResolutionError("Episode index is invalid.", 400);
  }

  if (episodeIndex > drama.episodeCount) {
    throw new DramaStreamResolutionError(
      "Requested episode is out of range.",
      400,
    );
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

  const provider = drama.providerName as ProviderType;

  if (!isActiveProviderType(provider)) {
    throw new DramaStreamResolutionError(
      "Provider untuk drama ini sedang dinonaktifkan.",
      410,
    );
  }

  const resolved = await resolveStreamRequest({
    provider,
    providerDramaId: drama.providerDramaId,
    episodeIndex,
  });

  const streamPayload = await fetchProviderJson("stream", provider, resolved.streamArgs, {
    revalidate: 3600,
  });

  const upstreamPayloadError = getProviderPayloadError(streamPayload);

  if (upstreamPayloadError) {
    throw new DramaStreamResolutionError(
      `Upstream stream resolution failed. ${upstreamPayloadError}`,
      502,
    );
  }

  const normalized = normalizeStreamPayload({
    dramaId: drama.id,
    provider,
    episodeIndex,
    payload: streamPayload,
  });

  const proxiedNormalized = {
    ...normalized,
    qualities: normalized.qualities.map((quality) => ({
      ...quality,
      url: shouldProxyMediaUrl(quality.url)
        ? buildMediaProxyUrl(quality.url)
        : quality.url,
    })),
    subtitles: normalized.subtitles.map((subtitle) => ({
      ...subtitle,
      url: shouldProxyMediaUrl(subtitle.url)
        ? buildMediaProxyUrl(subtitle.url)
        : subtitle.url,
    })),
  } satisfies StreamResponse;

  if (!proxiedNormalized.qualities.length) {
    throw new DramaStreamResolutionError(
      "No playable stream qualities were found.",
      502,
    );
  }

  return {
    drama,
    stream: proxiedNormalized,
    streamPayload,
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

  if (error instanceof RangeError) {
    return {
      status: 400,
      body: {
        error: error.message,
      },
    };
  }

  if (error instanceof UpstreamHttpError) {
    return {
      status: 502,
      body: {
        error: "Upstream stream resolution failed.",
        status: error.status,
        detail: error.message,
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
