import { NextResponse } from "next/server";

import { getHomepageFeedPage } from "@/lib/catalog-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "18", 10);
  const platform = searchParams.get("platform")?.trim() || null;

  if (!Number.isFinite(offset) || offset < 0) {
    return NextResponse.json(
      { error: "Parameter offset tidak valid." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(limit) || limit < 1) {
    return NextResponse.json(
      { error: "Parameter limit tidak valid." },
      { status: 400 },
    );
  }

  const payload = await getHomepageFeedPage(offset, limit, platform);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      "Netlify-Vary": "query=offset|limit|platform",
    },
  });
}
