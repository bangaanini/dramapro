import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isProviderType } from "@/lib/provider-adapter";

export const runtime = "nodejs";

const MAX_RESULTS = 24;
const MIN_QUERY_LENGTH = 3;

function normalizeQuery(value: string | null) {
  return value?.trim() ?? "";
}

function buildQueryFilter(query: string): Prisma.DramaWhereInput | null {
  const normalized = query.trim();

  if (normalized.length < MIN_QUERY_LENGTH) {
    return null;
  }

  const terms = normalized
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= MIN_QUERY_LENGTH);

  if (terms.length === 0) {
    return null;
  }

  return {
    AND: terms.map((term) => ({
      OR: [
        {
          title: {
            contains: term,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: term,
            mode: "insensitive",
          },
        },
      ],
    })),
  };
}

export async function GET(request: NextRequest) {
  const query = normalizeQuery(request.nextUrl.searchParams.get("q"));
  const providerParam = normalizeQuery(
    request.nextUrl.searchParams.get("provider"),
  );
  const tag = normalizeQuery(request.nextUrl.searchParams.get("tag"));
  const provider = isProviderType(providerParam) ? providerParam : "";
  const limitParam = Number.parseInt(
    request.nextUrl.searchParams.get("limit") ?? "",
    10,
  );
  const take =
    Number.isInteger(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_RESULTS)
      : 12;

  const textFilter = buildQueryFilter(query);

  if (!textFilter && !provider && !tag) {
    return NextResponse.json({
      query,
      results: [],
      total: 0,
      minimumQueryLength: MIN_QUERY_LENGTH,
    });
  }

  const where: Prisma.DramaWhereInput = {
    AND: [
      provider
        ? {
            providerName: provider,
          }
        : {},
      tag
        ? {
            tags: {
              has: tag,
            },
          }
        : {},
      textFilter ?? {},
    ],
  };

  const [results, total] = await Promise.all([
    prisma.drama.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        title: true,
        thumbUrl: true,
        providerName: true,
        episodeCount: true,
        tags: true,
      },
    }),
    prisma.drama.count({ where }),
  ]);

  return NextResponse.json({
    query,
    provider,
    tag,
    total,
    minimumQueryLength: MIN_QUERY_LENGTH,
    results,
  });
}
