import { NextRequest, NextResponse } from "next/server";

import { AFFILIATE_COOKIE, getAffiliateSettings } from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { resolveSafeRedirectPath } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const referralCode = request.nextUrl.searchParams.get("ref")?.trim().toUpperCase();
  const next = resolveSafeRedirectPath(request.nextUrl.searchParams.get("next"));
  const mode = request.nextUrl.searchParams.get("mode");
  const redirectUrl = new URL(next, request.url);

  if (!referralCode) {
    if (mode === "json") {
      return NextResponse.json({ ok: false, captured: false }, { status: 400 });
    }

    return NextResponse.redirect(redirectUrl);
  }

  const [settings, referrer] = await Promise.all([
    getAffiliateSettings(),
    prisma.user.findUnique({
      where: { affiliateCode: referralCode },
      select: { id: true },
    }),
  ]);

  const response =
    mode === "json"
      ? NextResponse.json({ ok: true, captured: false })
      : NextResponse.redirect(redirectUrl);

  if (!settings.isEnabled || !referrer) {
    return response;
  }

  response.cookies.set(AFFILIATE_COOKIE, referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * settings.cookieTtlDays,
  });

  return response;
}
