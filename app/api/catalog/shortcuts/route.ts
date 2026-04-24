import { NextResponse } from "next/server";

import { getCatalogShortcuts } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET() {
  const shortcuts = await getCatalogShortcuts();

  return NextResponse.json(shortcuts, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
