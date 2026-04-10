import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [favoritesCount, historyCount] = await Promise.all([
    prisma.favoriteDrama.count({
      where: { userId: user.id },
    }),
    prisma.watchHistory.count({
      where: { userId: user.id },
    }),
  ]);

  return NextResponse.json({
    user,
    favoritesCount,
    historyCount,
  });
}
