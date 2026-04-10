import { NextResponse } from "next/server";

import { getHomepageCatalogData } from "@/lib/catalog-data";
import { getSearchShortcuts } from "@/lib/search-shortcuts";

export const runtime = "nodejs";

export async function GET() {
  const [catalogData, shortcuts] = await Promise.all([
    getHomepageCatalogData(),
    getSearchShortcuts(),
  ]);

  return NextResponse.json(
    {
      ...catalogData,
      shortcuts,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
