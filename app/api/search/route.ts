import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { STREAMAPI_SOURCE } from "@/lib/provider-sync";
import { PROVIDERS as STREAMAPI_PROVIDER_CODES } from "@/lib/streamapi/types";

export const runtime = "nodejs";

const MAX_RESULTS = 24;

function normalizeQuery(value: string | null) {
  return value?.trim() ?? "";
}

export async function GET(request: NextRequest) {
  const query = normalizeQuery(request.nextUrl.searchParams.get("q"));
  const tabId = normalizeQuery(request.nextUrl.searchParams.get("tabId"));
  const tag = normalizeQuery(request.nextUrl.searchParams.get("tag"));
  const limitParam = Number.parseInt(
    request.nextUrl.searchParams.get("limit") ?? "",
    10,
  );
  const take =
    Number.isInteger(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_RESULTS)
      : 18;

  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  if (!tabId && !tag && terms.length === 0) {
    return NextResponse.json({
      query,
      tabId,
      tag,
      total: 0,
      minimumQueryLength: 2,
      results: [],
    });
  }

  const finalResults = await prisma.catalogSeries.findMany({
    where: {
      catalogSource: STREAMAPI_SOURCE,
      platformId: { in: [...STREAMAPI_PROVIDER_CODES] },
      isHomepageVisible: true,
      AND: [
        tabId
          ? {
              tabMemberships: {
                some: {
                  tabId,
                },
              },
            }
          : {},
        tag
          ? {
              tags: {
                has: tag,
              },
            }
          : {},
        ...terms.map((term) => ({
          OR: [
            {
              title: {
                contains: term,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              description: {
                contains: term,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              tags: {
                has: term,
              },
            },
          ],
        })),
      ],
    },
    include: {
      platform: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take,
  });

  return NextResponse.json({
    query,
    tabId,
    tag,
    total: finalResults.length,
    minimumQueryLength: 2,
    results: finalResults.map((series) => ({
      id: series.id,
      title: series.title,
      thumbUrl: series.coverUrl,
      providerName: series.platform.name,
      episodeCount: series.chapterCount,
      tags: series.tags,
      description: series.description,
      playCount: series.playCount,
    })),
  });
}
