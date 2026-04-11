import { NextRequest } from "next/server";

import { buildMediaProxyUrl, shouldProxyMediaUrl } from "@/lib/media-proxy";
import { prisma } from "@/lib/prisma";
import {
  getProviderPayloadError,
  ProviderType,
  StreamResponse,
  UpstreamHttpError,
  fetchProviderJson,
  normalizeStreamPayload,
  resolveStreamRequest,
} from "@/lib/provider-adapter";
import { getUserFromRequest } from "@/lib/user-auth";
import {
  getVipLockStartEpisode,
  isEpisodeVipLocked,
  isVipActive,
} from "@/lib/vip";

export const runtime = "nodejs";

function parseEpisodeIndex(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const internalDramaId = request.nextUrl.searchParams.get("internalDramaId");
  const episodeIndex = parseEpisodeIndex(
    request.nextUrl.searchParams.get("episodeIndex"),
  );

  if (!internalDramaId || !episodeIndex) {
    return Response.json(
      {
        error:
          "Query params `internalDramaId` and `episodeIndex` are required.",
      },
      { status: 400 },
    );
  }

  const [drama, vipSettings, user] = await Promise.all([
    prisma.drama.findUnique({
      where: { id: internalDramaId },
      select: {
        id: true,
        providerName: true,
        providerDramaId: true,
        episodeCount: true,
      },
    }),
    prisma.vipSettings.findUnique({
      where: { id: "global" },
      select: {
        isEnabled: true,
        lockFromEpisode: true,
      },
    }),
    getUserFromRequest(request),
  ]);

  if (!drama) {
    return Response.json({ error: "Drama not found." }, { status: 404 });
  }

  if (episodeIndex > drama.episodeCount) {
    return Response.json(
      { error: "Requested episode is out of range." },
      { status: 400 },
    );
  }

  const vipLockFromEpisode = isVipActive(user?.vipExpiresAt)
    ? null
    : getVipLockStartEpisode(vipSettings);

  if (isEpisodeVipLocked(episodeIndex, vipLockFromEpisode)) {
    return Response.json(
      {
        error: `Episode VIP terkunci mulai EP.${vipLockFromEpisode}.`,
      },
      { status: 403 },
    );
  }

  try {
    const resolved = await resolveStreamRequest({
      provider: drama.providerName as ProviderType,
      providerDramaId: drama.providerDramaId,
      episodeIndex,
    });

    const streamPayload = await fetchProviderJson(
      "stream",
      drama.providerName as ProviderType,
      resolved.streamArgs,
      { revalidate: 3600 },
    );

    const upstreamPayloadError = getProviderPayloadError(streamPayload);

    if (upstreamPayloadError) {
      return Response.json(
        {
          error: "Upstream stream resolution failed.",
          detail: upstreamPayloadError,
        },
        { status: 502 },
      );
    }

    const normalized = normalizeStreamPayload({
      dramaId: drama.id,
      provider: drama.providerName as ProviderType,
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
    };

    if (!proxiedNormalized.qualities.length) {
      return Response.json(
        { error: "No playable stream qualities were found." },
        { status: 502 },
      );
    }

    return Response.json(proxiedNormalized satisfies StreamResponse);
  } catch (error) {
    if (error instanceof RangeError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof UpstreamHttpError) {
      return Response.json(
        {
          error: "Upstream stream resolution failed.",
          status: error.status,
          detail: error.message,
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected stream failure.",
      },
      { status: 502 },
    );
  }
}
