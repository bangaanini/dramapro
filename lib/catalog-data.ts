import { unstable_cache } from "next/cache";

import type { SyncSource } from "@/lib/provider-adapter";
import { prisma } from "@/lib/prisma";

const INITIAL_HOME_SECTION_ITEMS = 18;

export type HomeFeedEntry = {
  id: string;
  href: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
  description: string;
  watchValue: string;
  popularityScore: number;
};

type HomeCatalogPayload = {
  totalDramas: number;
  homeEntries: HomeFeedEntry[];
  homeTotal: number;
  newEntries: HomeFeedEntry[];
  newTotal: number;
  popularEntries: HomeFeedEntry[];
  popularTotal: number;
};

function toHomeFeedEntries(
  entries: Array<{
    drama: {
      id: string;
      title: string;
      thumbUrl: string;
      providerName: string;
      episodeCount: number;
      description: string | null;
      watchValue: string | null;
    };
  }>,
): HomeFeedEntry[] {
  return entries.map(({ drama }) => ({
    id: drama.id,
    href: `/watch/${drama.id}`,
    title: drama.title,
    thumbUrl: drama.thumbUrl,
    providerName: drama.providerName,
    episodeCount: drama.episodeCount,
    description: drama.description || "",
    watchValue: drama.watchValue || "",
    popularityScore: parsePopularityScore(drama.watchValue),
  }));
}

function parsePopularityScore(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return 0;
  }

  const compact = normalized.replace(/\s+/g, "");
  const match = compact.match(/(\d+(?:[.,]\d+)?)([kmbw万]?)/i);

  if (!match) {
    const digitsOnly = compact.replace(/[^\d]/g, "");
    return digitsOnly ? Number(digitsOnly) : 0;
  }

  const numericValue = Number(match[1].replace(/,/g, "."));

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  switch (match[2]) {
    case "k":
      return numericValue * 1_000;
    case "m":
      return numericValue * 1_000_000;
    case "b":
      return numericValue * 1_000_000_000;
    case "w":
    case "万":
      return numericValue * 10_000;
    default:
      return numericValue;
  }
}

const getCachedHomepageCatalogData = unstable_cache(
  async (): Promise<HomeCatalogPayload> => {
    const [
      totalDramas,
      homeEntries,
      homeTotal,
      newEntries,
      newTotal,
      popularEntries,
      popularTotal,
    ] = await Promise.all([
      prisma.drama.count(),
      prisma.dramaFeed.findMany({
        where: { source: "home" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: INITIAL_HOME_SECTION_ITEMS,
      }),
      prisma.dramaFeed.count({ where: { source: "home" } }),
      prisma.dramaFeed.findMany({
        where: { source: "new" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: INITIAL_HOME_SECTION_ITEMS,
      }),
      prisma.dramaFeed.count({ where: { source: "new" } }),
      prisma.dramaFeed.findMany({
        where: { source: "popular" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: INITIAL_HOME_SECTION_ITEMS,
      }),
      prisma.dramaFeed.count({ where: { source: "popular" } }),
    ]);

    const normalizedPopularEntries = toHomeFeedEntries(popularEntries);

    return {
      totalDramas,
      homeEntries: toHomeFeedEntries(homeEntries),
      homeTotal,
      newEntries: toHomeFeedEntries(newEntries),
      newTotal,
      popularEntries: normalizedPopularEntries,
      popularTotal,
    };
  },
  ["homepage-catalog"],
  {
    revalidate: 300,
    tags: ["catalog-home"],
  },
);

export async function getHomepageCatalogData() {
  return getCachedHomepageCatalogData();
}

export async function getHomepageFeedPage(
  source: SyncSource,
  offset: number,
  limit: number,
) {
  const resolvedOffset = Math.max(0, offset);
  const resolvedLimit = Math.min(Math.max(1, limit), 36);

  const [entries, total] = await Promise.all([
    prisma.dramaFeed.findMany({
      where: { source },
      include: { drama: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      skip: resolvedOffset,
      take: resolvedLimit,
    }),
    prisma.dramaFeed.count({ where: { source } }),
  ]);

  const normalizedEntries = toHomeFeedEntries(entries);
  const nextOffset = resolvedOffset + normalizedEntries.length;

  return {
    entries: normalizedEntries,
    total,
    nextOffset,
    hasMore: nextOffset < total,
  };
}
