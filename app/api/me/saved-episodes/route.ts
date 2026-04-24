import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const savedEpisodes = await prisma.savedEpisode.findMany({
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
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const groupedEntries = new Map<
    string,
    {
      id: string;
      updatedAt: string;
      savedCount: number;
      lastEpisodeIndex: number;
      drama: {
        id: string;
        title: string;
        thumbUrl: string;
        providerName: string;
        episodeCount: number;
      };
    }
  >();

  for (const savedEpisode of savedEpisodes) {
    const existingEntry = groupedEntries.get(savedEpisode.seriesId);

    if (existingEntry) {
      existingEntry.savedCount += 1;
      continue;
    }

    groupedEntries.set(savedEpisode.seriesId, {
      id: savedEpisode.seriesId,
      updatedAt: savedEpisode.updatedAt.toISOString(),
      savedCount: 1,
      lastEpisodeIndex: savedEpisode.episodeIndex,
      drama: {
        id: savedEpisode.series.id,
        title: savedEpisode.series.title,
        thumbUrl: savedEpisode.series.coverUrl,
        providerName: savedEpisode.series.platform.name,
        episodeCount: savedEpisode.series.chapterCount,
      },
    });
  }

  return NextResponse.json({
    entries: Array.from(groupedEntries.values()),
  });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        dramaId?: string;
        episodeIndex?: number;
      }
    | null;
  const dramaId = payload?.dramaId?.trim();
  const episodeIndex = Number.parseInt(String(payload?.episodeIndex ?? ""), 10);

  if (!dramaId) {
    return NextResponse.json({ error: "Drama ID is required." }, { status: 400 });
  }

  if (!Number.isInteger(episodeIndex) || episodeIndex < 1) {
    return NextResponse.json(
      { error: "Episode index must be a positive integer." },
      { status: 400 },
    );
  }

  const existingSavedEpisode = await prisma.savedEpisode.findUnique({
    where: {
      userId_seriesId_episodeIndex: {
        userId: user.id,
        seriesId: dramaId,
        episodeIndex,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingSavedEpisode) {
    await prisma.savedEpisode.delete({
      where: {
        id: existingSavedEpisode.id,
      },
    });

    revalidatePath("/library");
    revalidatePath("/profile");
    revalidatePath(`/watch/${dramaId}`);
    revalidatePath(`/watch/${dramaId}/play`);

    return NextResponse.json({
      isSaved: false,
      message: `EP.${episodeIndex} dihapus dari tersimpan.`,
    });
  }

  await prisma.savedEpisode.create({
    data: {
      userId: user.id,
      seriesId: dramaId,
      episodeIndex,
    },
  });

  revalidatePath("/library");
  revalidatePath("/profile");
  revalidatePath(`/watch/${dramaId}`);
  revalidatePath(`/watch/${dramaId}/play`);

  return NextResponse.json({
    isSaved: true,
    message: `EP.${episodeIndex} disimpan ke perpustakaan.`,
  });
}
