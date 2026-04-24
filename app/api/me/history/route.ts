import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const historyEntries = await prisma.watchHistory.findMany({
    where: {
      userId: user.id,
    },
    include: {
      series: {
        include: {
          platform: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 120,
  });

  return NextResponse.json({
    entries: historyEntries.map((entry) => ({
      id: entry.id,
      episodeIndex: entry.episodeIndex,
      lastPositionSeconds: entry.lastPositionSeconds,
      updatedAt: entry.updatedAt.toISOString(),
      drama: {
        id: entry.series.id,
        title: entry.series.title,
        thumbUrl: entry.series.coverUrl,
        providerName: entry.series.platform.name,
        episodeCount: entry.series.chapterCount,
        tags: entry.series.tags,
      },
    })),
  });
}
