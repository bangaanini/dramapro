import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveDramaStreamSources, toStreamErrorResponse } from "@/lib/stream-access";
import { getUserFromRequest } from "@/lib/user-auth";
import {
  getVipLockStartEpisode,
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

  const [vipSettings, user] = await Promise.all([
    prisma.vipSettings.findUnique({
      where: { id: "global" },
      select: {
        isEnabled: true,
        lockFromEpisode: true,
      },
    }),
    getUserFromRequest(request),
  ]);

  const vipLockFromEpisode = isVipActive(user?.vipExpiresAt)
    ? null
    : getVipLockStartEpisode(vipSettings);

  try {
    const resolved = await resolveDramaStreamSources({
      internalDramaId,
      episodeIndex,
      vipLockFromEpisode,
    });

    return Response.json(resolved.stream);
  } catch (error) {
    const resolvedError = toStreamErrorResponse(error);
    return Response.json(resolvedError.body, { status: resolvedError.status });
  }
}
