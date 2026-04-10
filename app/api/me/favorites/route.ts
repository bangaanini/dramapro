import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favoriteDrama.findMany({
    where: { userId: user.id },
    include: { drama: true },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return NextResponse.json({
    entries: favorites.map((favorite) => ({
      id: favorite.id,
      createdAt: favorite.createdAt.toISOString(),
      drama: {
        id: favorite.drama.id,
        title: favorite.drama.title,
        thumbUrl: favorite.drama.thumbUrl,
        providerName: favorite.drama.providerName,
        episodeCount: favorite.drama.episodeCount,
      },
    })),
  });
}
