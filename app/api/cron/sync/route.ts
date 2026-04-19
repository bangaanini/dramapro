import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

import { getAdminFromRequest } from "@/lib/admin-auth";
import { hasValidInternalSecret } from "@/lib/internal-route-auth";
import {
  ACTIVE_PROVIDERS,
  normalizeSyncSource,
  UpstreamHttpError,
  isActiveProviderType,
  SYNC_SOURCES,
} from "@/lib/provider-adapter";
import { runProviderSync } from "@/lib/sync-dramas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export async function GET(request: NextRequest) {
  const providerParam = request.nextUrl.searchParams.get("provider");
  const pageParam = request.nextUrl.searchParams.get("page") ?? "1";
  const rawSourceParam = request.nextUrl.searchParams.get("source") ?? "home";

  try {
    const admin = await getAdminFromRequest(request);
    const hasValidSecret = hasValidInternalSecret(request);

    if (!admin && !hasValidSecret) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const sourceParam = normalizeSyncSource(rawSourceParam);
    const page = Number.parseInt(pageParam, 10);

    if (!providerParam || !isActiveProviderType(providerParam)) {
      return Response.json(
        {
          error: "Invalid provider.",
          supportedProviders: ACTIVE_PROVIDERS,
        },
        { status: 400 },
      );
    }

    if (!sourceParam) {
      return Response.json(
        {
          error: "Invalid source.",
          supportedSources: [...SYNC_SOURCES, "populer"],
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(page) || page < 1) {
      return Response.json(
        { error: "Query param `page` must be an integer greater than 0." },
        { status: 400 },
      );
    }

    const result = await runProviderSync(providerParam, page, sourceParam);
    revalidateTag("catalog-home", "max");
    revalidateTag("catalog-shortcuts", "max");
    return Response.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      return Response.json(
        {
          error: "Upstream request failed.",
          provider: providerParam,
          source: rawSourceParam,
          page: pageParam,
          status: error.status,
          detail: error.message,
        },
        { status: 502, headers: NO_STORE_HEADERS },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected sync failure.",
        provider: providerParam,
        source: rawSourceParam,
        page: pageParam,
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
