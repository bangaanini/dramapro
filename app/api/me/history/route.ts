import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HistoryRow = {
  id: string;
  episodeIndex: number;
  lastPositionSeconds: number;
  updatedAt: Date;
  dramaId: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
  tags: string[] | null;
};

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const historyEntries = await prisma.$queryRaw<HistoryRow[]>`
    SELECT
      w."id",
      w."episodeIndex",
      w."lastPositionSeconds",
      w."updatedAt",
      s."id" AS "dramaId",
      s."title",
      s."coverUrl" AS "thumbUrl",
      p."name" AS "providerName",
      s."chapterCount" AS "episodeCount",
      s."tags"
    FROM "WatchHistory" w
    JOIN "CatalogSeries" s
      ON s."id" = w."seriesId"
    JOIN "CatalogPlatform" p
      ON p."id" = s."platformId"
    WHERE w."userId" = ${user.id}::uuid
      AND w."seriesId" IS NOT NULL
    ORDER BY w."updatedAt" DESC
    LIMIT 120
  `;

  return NextResponse.json({
    entries: historyEntries.map((entry) => ({
      id: entry.id,
      episodeIndex: entry.episodeIndex,
      lastPositionSeconds: entry.lastPositionSeconds,
      updatedAt: entry.updatedAt.toISOString(),
      drama: {
        id: entry.dramaId,
        title: entry.title,
        thumbUrl: entry.thumbUrl,
        providerName: entry.providerName,
        episodeCount: entry.episodeCount,
        tags: entry.tags ?? [],
      },
    })),
  });
}
