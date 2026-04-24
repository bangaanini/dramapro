import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import {
  DEFAULT_CATALOG_LANGUAGE,
  DEFAULT_CATALOG_PLATFORM,
} from "@/lib/catalog-upstream";
import { hasValidInternalSecret } from "@/lib/internal-route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdminFromRequestSafe(request: NextRequest) {
  const { getAdminFromRequest } = await import("@/lib/admin-auth");
  return getAdminFromRequest(request);
}

async function loadCatalogModule() {
  return import("@/lib/catalog");
}

async function assertAuthorized(request: NextRequest) {
  const admin = await getAdminFromRequestSafe(request);
  const hasValidSecret = hasValidInternalSecret(request);

  if (!admin && !hasValidSecret) {
    return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  if (!(await assertAuthorized(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { getCatalogSyncDashboardForPlatform } = await loadCatalogModule();
  const platform =
    request.nextUrl.searchParams.get("platform")?.trim() ||
    DEFAULT_CATALOG_PLATFORM;
  const language =
    request.nextUrl.searchParams.get("language")?.trim() ||
    DEFAULT_CATALOG_LANGUAGE;
  const dashboard = await getCatalogSyncDashboardForPlatform(platform, language);
  return Response.json(dashboard, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await assertAuthorized(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const {
    getCatalogSyncDashboardForPlatform,
    getLatestCatalogSyncAllJob,
    hydratePendingSeriesDetails,
    initializeCatalog,
    initializeCatalogForPlatform,
    runCatalogSyncAllStep,
    startCatalogSyncAllJob,
    syncTabFirstPage,
    syncTabNextPage,
    syncTablist,
  } = await loadCatalogModule();
  const body = (await request.json().catch(() => null)) as
      | {
        mode?: string;
        tabId?: string;
        jobId?: string;
        runnerId?: string;
        platform?: string;
        language?: string;
      }
    | null;
  const mode = String(body?.mode ?? "").trim();
  const tabId = String(body?.tabId ?? "").trim();
  const jobId = String(body?.jobId ?? "").trim();
  const runnerId = String(body?.runnerId ?? "").trim();
  const platform = String(body?.platform ?? "").trim() || DEFAULT_CATALOG_PLATFORM;
  const language = String(body?.language ?? "").trim() || DEFAULT_CATALOG_LANGUAGE;

  if (!mode) {
    return Response.json({ error: "Mode wajib diisi." }, { status: 400 });
  }

  try {
    let result: unknown;
    let responseSyncJob: Awaited<ReturnType<typeof getLatestCatalogSyncAllJob>> | null =
      null;

    if (mode === "init") {
      result =
        platform === DEFAULT_CATALOG_PLATFORM && language === DEFAULT_CATALOG_LANGUAGE
          ? await initializeCatalog()
          : await initializeCatalogForPlatform(platform, language);
    } else if (mode === "start-sync-all") {
      result = await startCatalogSyncAllJob(language);
      responseSyncJob =
        result as Awaited<ReturnType<typeof getLatestCatalogSyncAllJob>>;
    } else if (mode === "run-sync-all-step") {
      const resolvedRunnerId =
        runnerId || `manual:${crypto.randomUUID()}`;
      result = await runCatalogSyncAllStep(jobId || undefined, resolvedRunnerId);
      responseSyncJob =
        (result as Awaited<ReturnType<typeof getLatestCatalogSyncAllJob>>) ?? null;
    } else if (mode === "refresh-tablist") {
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
      return Response.json({ error: "Mode tidak dikenali." }, { status: 400 });
    }

    revalidateTag("catalog-home", "max");
    revalidateTag("catalog-shortcuts", "max");

    const dashboard = await getCatalogSyncDashboardForPlatform(platform, language).catch(
      () => null,
    );

    return Response.json({
      ok: true,
      mode,
      result,
      syncJob: responseSyncJob ?? (await getLatestCatalogSyncAllJob()),
      ...(dashboard ? { dashboard } : {}),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sinkronisasi katalog gagal dijalankan.",
        mode,
      },
      { status: 500 },
    );
  }
}
