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
    where: { userId: user.id },
    include: { drama: true },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });

  return NextResponse.json({
    entries: historyEntries.map((entry) => ({
      id: entry.id,
      episodeIndex: entry.episodeIndex,
      lastPositionSeconds: entry.lastPositionSeconds,
      updatedAt: entry.updatedAt.toISOString(),
      drama: {
        id: entry.drama.id,
        title: entry.drama.title,
        providerName: entry.drama.providerName,
        tags: entry.drama.tags,
      },
    })),
  });
}
