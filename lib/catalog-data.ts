import { unstable_cache } from "next/cache";

import type { Drama, DramaFeed } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type FeedEntryWithDrama = DramaFeed & { drama: Drama };

type HomeCatalogPayload = {
  totalDramas: number;
  homeEntries: FeedEntryWithDrama[];
  homeTotal: number;
  newEntries: FeedEntryWithDrama[];
  newTotal: number;
  popularEntries: FeedEntryWithDrama[];
  popularTotal: number;
};

export async function getHomepageCatalogData(
  homeLimit: number,
  newLimit: number,
  popularLimit: number,
) {
  const getCachedData = unstable_cache(
    async (resolvedHomeLimit: number, resolvedNewLimit: number, resolvedPopularLimit: number): Promise<HomeCatalogPayload> => {
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
          take: resolvedHomeLimit,
        }),
        prisma.dramaFeed.count({ where: { source: "home" } }),
        prisma.dramaFeed.findMany({
          where: { source: "new" },
          include: { drama: true },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: resolvedNewLimit,
        }),
        prisma.dramaFeed.count({ where: { source: "new" } }),
        prisma.dramaFeed.findMany({
          where: { source: "popular" },
          include: { drama: true },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: resolvedPopularLimit,
        }),
        prisma.dramaFeed.count({ where: { source: "popular" } }),
      ]);

      return {
        totalDramas,
        homeEntries,
        homeTotal,
        newEntries,
        newTotal,
        popularEntries,
        popularTotal,
      };
    },
    ["homepage-catalog"],
    {
      revalidate: 300,
      tags: ["catalog-home"],
    },
  );

  return getCachedData(homeLimit, newLimit, popularLimit);
}
