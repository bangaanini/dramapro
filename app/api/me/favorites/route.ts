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
    where: { userId: user.id },
    include: { drama: true },
    orderBy: { createdAt: "desc" },
    take: 120,
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
      userId_dramaId: {
        userId: user.id,
        dramaId,
      },
    },
    select: {
      id: true,
      dramaId: true,
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
      dramaId,
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
