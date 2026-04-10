import { NextResponse } from "next/server";

import { getHomepageCatalogData } from "@/lib/catalog-data";

export const runtime = "nodejs";

export async function GET() {
  const catalogData = await getHomepageCatalogData();

  return NextResponse.json(
    catalogData,
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
