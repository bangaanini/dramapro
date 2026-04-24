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

  const favorites = await prisma.favoriteDrama.findMany({
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
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  return NextResponse.json({
    entries: favorites.map((favorite) => ({
      id: favorite.id,
      createdAt: favorite.createdAt.toISOString(),
      drama: {
        id: favorite.series.id,
        title: favorite.series.title,
        thumbUrl: favorite.series.coverUrl,
        providerName: favorite.series.platform.name,
        episodeCount: favorite.series.chapterCount,
      },
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { dramaId?: string }
    | null;
  const dramaId = payload?.dramaId?.trim();

  if (!dramaId) {
    return NextResponse.json({ error: "Drama ID is required." }, { status: 400 });
  }

  const existingFavorite = await prisma.favoriteDrama.findUnique({
    where: {
      userId_seriesId: {
        userId: user.id,
        seriesId: dramaId,
      },
    },
    select: {
      id: true,
      seriesId: true,
    },
  });

  if (existingFavorite) {
    await prisma.favoriteDrama.delete({
      where: {
        id: existingFavorite.id,
      },
    });

    revalidatePath("/library");
    revalidatePath("/profile");
    revalidatePath(`/watch/${dramaId}`);

    return NextResponse.json({
      isFavorite: false,
      message: "Drama dihapus dari favorit.",
    });
  }

    await prisma.favoriteDrama.create({
      data: {
        userId: user.id,
        seriesId: dramaId,
      },
    });

  revalidatePath("/library");
  revalidatePath("/profile");
  revalidatePath(`/watch/${dramaId}`);

  return NextResponse.json({
    isFavorite: true,
    message: "Drama disimpan ke favorit.",
  });
}
