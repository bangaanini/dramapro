import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { absoluteResolvedUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: await absoluteResolvedUrl("/"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: await absoluteResolvedUrl("/search"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: await absoluteResolvedUrl("/vip"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: await absoluteResolvedUrl("/affiliate"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  try {
    const dramas = await prisma.drama.findMany({
      where: {
        isStreamPlayable: true,
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const dramaRoutes: MetadataRoute.Sitemap = await Promise.all(dramas.map(async (drama) => ({
      url: await absoluteResolvedUrl(`/watch/${drama.id}`),
      lastModified: drama.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    })));

    return [...staticRoutes, ...dramaRoutes];
  } catch {
    return staticRoutes;
  }
}
