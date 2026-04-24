import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

type WatchHistoryPayload = {
  internalDramaId?: unknown;
  episodeIndex?: unknown;
  lastPositionSeconds?: unknown;
};

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WatchHistoryPayload;

  try {
    body = (await request.json()) as WatchHistoryPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const internalDramaId =
    typeof body.internalDramaId === "string" ? body.internalDramaId.trim() : "";
  const episodeIndex = Number.parseInt(String(body.episodeIndex ?? ""), 10);
  const lastPositionSeconds = Number.parseInt(
    String(body.lastPositionSeconds ?? 0),
    10,
  );

  if (!internalDramaId) {
    return NextResponse.json(
      { error: "internalDramaId is required." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(episodeIndex) || episodeIndex < 1) {
    return NextResponse.json(
      { error: "episodeIndex must be a positive integer." },
      { status: 400 },
    );
  }

  const drama = await prisma.catalogSeries.findUnique({
    where: { id: internalDramaId },
    select: { id: true },
  });

  if (!drama) {
    return NextResponse.json({ error: "Drama not found." }, { status: 404 });
  }

  await prisma.watchHistory.upsert({
    where: {
      userId_seriesId: {
        userId: user.id,
        seriesId: drama.id,
      },
    },
    create: {
      userId: user.id,
      seriesId: drama.id,
      episodeIndex,
      lastPositionSeconds: Math.max(0, lastPositionSeconds),
      watchedAt: new Date(),
    },
    update: {
      episodeIndex,
      lastPositionSeconds: Math.max(0, lastPositionSeconds),
      watchedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
