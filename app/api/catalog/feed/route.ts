import { NextResponse } from "next/server";

import { getHomepageFeedPage } from "@/lib/catalog-data";
import { normalizeSyncSource } from "@/lib/provider-adapter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceParam = searchParams.get("source") ?? "";
  const source = normalizeSyncSource(sourceParam);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "18", 10);

  if (!source) {
    return NextResponse.json(
      { error: "Parameter source tidak valid." },
      { status: 400 },
    );
  }

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

  const payload = await getHomepageFeedPage(source, offset, limit);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      "Netlify-Vary": "query=source|offset|limit",
    },
  });
}
