import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

const MAX_HOME_SECTION_ITEMS = 48;
const HERO_BANNER_ITEMS = 4;

export type HomeFeedEntry = {
  id: string;
  href: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
};

type HomeCatalogPayload = {
  totalDramas: number;
  heroBanners: HomeFeedEntry[];
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

function buildHeroBanners(popularEntries: HomeFeedEntry[]) {
  return popularEntries.slice(0, HERO_BANNER_ITEMS);
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

    const normalizedPopularEntries = toHomeFeedEntries(popularEntries);

    return {
      totalDramas,
      heroBanners: buildHeroBanners(normalizedPopularEntries),
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
