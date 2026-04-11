import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AFFILIATE_COOKIE } from "@/lib/affiliate";

export function proxy(request: NextRequest) {
  const referralCode = request.nextUrl.searchParams.get("ref")?.trim().toUpperCase();

  if (!referralCode) {
    return NextResponse.next();
  }

  const nextUrl = request.nextUrl.clone();
  nextUrl.searchParams.delete("ref");

  const response = NextResponse.redirect(nextUrl);
  response.cookies.set(AFFILIATE_COOKIE, referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4|m3u8|txt)$).*)",
  ],
};
