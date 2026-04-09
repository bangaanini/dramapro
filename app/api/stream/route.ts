import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  ProviderType,
  StreamResponse,
  UpstreamHttpError,
  fetchProviderJson,
  normalizeStreamPayload,
  resolveStreamRequest,
} from "@/lib/provider-adapter";

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

  const drama = await prisma.drama.findUnique({
    where: { id: internalDramaId },
    select: {
      id: true,
      providerName: true,
      providerDramaId: true,
      episodeCount: true,
    },
  });

  if (!drama) {
    return Response.json({ error: "Drama not found." }, { status: 404 });
  }

  if (episodeIndex > drama.episodeCount) {
    return Response.json(
      { error: "Requested episode is out of range." },
      { status: 400 },
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

    const normalized = normalizeStreamPayload({
      dramaId: drama.id,
      provider: drama.providerName as ProviderType,
      episodeIndex,
      payload: streamPayload,
    });

    if (!normalized.qualities.length) {
      return Response.json(
        { error: "No playable stream qualities were found." },
        { status: 502 },
      );
    }

    return Response.json(normalized satisfies StreamResponse);
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
