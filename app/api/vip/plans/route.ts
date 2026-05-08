import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";
import { isVipActive } from "@/lib/vip";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const [user, plans] = await Promise.all([
    getUserFromRequest(request),
    prisma.vipPricePlan.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { durationDays: "asc" },
        { priceAmount: "asc" },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        badgeText: true,
        badgeColor: true,
        priceAmount: true,
        currency: true,
        durationDays: true,
      },
    }),
  ]);

  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          name: user.name,
          isSignedIn: true,
          hasActiveVip: isVipActive(user.vipExpiresAt),
          vipExpiresAt: user.vipExpiresAt?.toISOString() ?? null,
        }
      : {
          isSignedIn: false,
          hasActiveVip: false,
          vipExpiresAt: null,
        },
    plans,
  });
}
