import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  await prisma.user.updateMany({
    where: {
      id: user.id,
      telegramMiniAppWelcomeSeenAt: null,
    },
    data: {
      telegramMiniAppWelcomeSeenAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    telegramMiniAppWelcomeSeenAt:
      user.telegramMiniAppWelcomeSeenAt?.toISOString() ?? now.toISOString(),
  });
}
