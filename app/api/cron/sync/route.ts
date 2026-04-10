import { NextRequest } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import {
  PROVIDERS,
  UpstreamHttpError,
  isProviderType,
  isSyncSource,
  SYNC_SOURCES,
} from "@/lib/provider-adapter";
import { runProviderSync } from "@/lib/sync-dramas";

export const runtime = "nodejs";

function getSecretFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-cron-secret");
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const suppliedSecret = getSecretFromRequest(request);
  const admin = await getAdminFromRequest(request);
  const hasValidSecret = Boolean(cronSecret && suppliedSecret === cronSecret);

  if (!admin && !hasValidSecret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const providerParam = request.nextUrl.searchParams.get("provider");
  const pageParam = request.nextUrl.searchParams.get("page") ?? "1";
  const sourceParam = request.nextUrl.searchParams.get("source") ?? "home";
  const page = Number.parseInt(pageParam, 10);

  if (!providerParam || !isProviderType(providerParam)) {
    return Response.json(
      {
        error: "Invalid provider.",
        supportedProviders: PROVIDERS,
      },
      { status: 400 },
    );
  }

  if (!isSyncSource(sourceParam)) {
    return Response.json(
      {
        error: "Invalid source.",
        supportedSources: SYNC_SOURCES,
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

  try {
    const result = await runProviderSync(providerParam, page, sourceParam);
    return Response.json(result);
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      return Response.json(
        {
          error: "Upstream request failed.",
          provider: providerParam,
          status: error.status,
          detail: error.message,
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected sync failure.",
      },
      { status: 502 },
    );
  }
}
