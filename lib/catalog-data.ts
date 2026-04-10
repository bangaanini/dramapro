import { unstable_cache } from "next/cache";

import type { ProviderName } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_HOME_SECTION_ITEMS = 96;

export type HomeFeedEntry = {
  id: string;
  href: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
};

export type HomeHeroSlide = {
  providerName: ProviderName;
  items: HomeFeedEntry[];
};

type HomeCatalogPayload = {
  totalDramas: number;
  heroSlides: HomeHeroSlide[];
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
  }));
}

function buildHeroSlides(popularEntries: HomeFeedEntry[]): HomeHeroSlide[] {
  const groupedEntries = new Map<ProviderName, HomeFeedEntry[]>();

  for (const entry of popularEntries) {
    const providerName = entry.providerName as ProviderName;
    const currentEntries = groupedEntries.get(providerName) ?? [];

    if (currentEntries.length < 2) {
      currentEntries.push(entry);
      groupedEntries.set(providerName, currentEntries);
    }
  }

  return Array.from(groupedEntries.entries())
    .filter(([, items]) => items.length > 0)
    .map(([providerName, items]) => ({
      providerName,
      items,
    }));
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
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: MAX_HOME_SECTION_ITEMS,
      }),
      prisma.dramaFeed.count({ where: { source: "home" } }),
      prisma.dramaFeed.findMany({
        where: { source: "new" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: MAX_HOME_SECTION_ITEMS,
      }),
      prisma.dramaFeed.count({ where: { source: "new" } }),
      prisma.dramaFeed.findMany({
        where: { source: "popular" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: MAX_HOME_SECTION_ITEMS,
      }),
      prisma.dramaFeed.count({ where: { source: "popular" } }),
    ]);

    return {
      totalDramas,
      heroSlides: buildHeroSlides(toHomeFeedEntries(popularEntries)),
      homeEntries: toHomeFeedEntries(homeEntries),
      homeTotal,
      newEntries: toHomeFeedEntries(newEntries),
      newTotal,
      popularEntries: toHomeFeedEntries(popularEntries),
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
