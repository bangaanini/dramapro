import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import {
  hydratePendingSeriesDetails,
  initializeCatalog,
  initializeCatalogForPlatform,
  syncTabFirstPage,
  syncTabNextPage,
  syncTablist,
} from "@/lib/catalog";
import {
  DEFAULT_CATALOG_LANGUAGE,
  DEFAULT_CATALOG_PLATFORM,
} from "@/lib/catalog-upstream";
import { hasValidInternalSecret } from "@/lib/internal-route-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasValidInternalSecret(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode")?.trim() || "sync-first-batch";
  const tabId = request.nextUrl.searchParams.get("tabId")?.trim() || "";
  const platform =
    request.nextUrl.searchParams.get("platform")?.trim() ||
    DEFAULT_CATALOG_PLATFORM;
  const language =
    request.nextUrl.searchParams.get("language")?.trim() ||
    DEFAULT_CATALOG_LANGUAGE;

  try {
    let result: unknown;

    if (mode === "init") {
      result =
        platform === DEFAULT_CATALOG_PLATFORM && language === DEFAULT_CATALOG_LANGUAGE
          ? await initializeCatalog()
          : await initializeCatalogForPlatform(platform, language);
    } else if (mode === "tablist") {
      result = await syncTablist(platform, language);
    } else if (mode === "sync-first-page") {
      if (!tabId) {
        return Response.json({ error: "tabId wajib diisi." }, { status: 400 });
      }

      result = await syncTabFirstPage(tabId);
    } else if (mode === "sync-next-page") {
      if (!tabId) {
        return Response.json({ error: "tabId wajib diisi." }, { status: 400 });
      }

      result = await syncTabNextPage(tabId);
    } else if (mode === "hydrate-pending") {
      result = await hydratePendingSeriesDetails(12, {
        platformId: platform,
        languageCode: language,
      });
    } else {
      const selectedLanguage = await prisma.catalogLanguage.findFirst({
        where: {
          platformId: platform,
          code: language,
          isActive: true,
        },
      });
      const tabs = await prisma.catalogTab.findMany({
        where: {
          platformId: platform,
          ...(selectedLanguage ? { languageId: selectedLanguage.id } : {}),
          isActive: true,
        },
        orderBy: [{ positionIndex: "asc" }, { sortOrder: "asc" }],
        take: 4,
      });

      result = [];

      for (const tab of tabs) {
        (result as unknown[]).push(await syncTabFirstPage(tab.id));
      }
    }

    revalidateTag("catalog-home", "max");
    revalidateTag("catalog-shortcuts", "max");

    return Response.json({
      ok: true,
      mode,
      result,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unexpected sync failure.",
        mode,
        tabId,
      },
      { status: 502 },
    );
  }
}
