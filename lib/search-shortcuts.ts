import { unstable_cache } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getSearchShortcuts() {
  const getCachedShortcuts = unstable_cache(
    async () => {
      const [providerCounts, tagRows] = await Promise.all([
        prisma.drama.groupBy({
          by: ["providerName"],
          _count: {
            _all: true,
          },
          orderBy: {
            providerName: "asc",
          },
        }),
        prisma.$queryRaw<Array<{ tag: string; count: number }>>(Prisma.sql`
          SELECT tag, COUNT(*)::int AS count
          FROM (
            SELECT UNNEST(tags) AS tag
            FROM "Drama"
          ) AS tags_expanded
          WHERE tag <> ''
          GROUP BY tag
          ORDER BY COUNT(*) DESC, tag ASC
          LIMIT 16
        `),
      ]);

      return {
        providers: providerCounts.map((provider) => ({
          value: provider.providerName,
          count: provider._count._all,
        })),
        tags: tagRows.map((tag) => ({
          value: tag.tag,
          count: Number(tag.count),
        })),
      };
    },
    ["search-shortcuts"],
    {
      revalidate: 600,
      tags: ["catalog-shortcuts"],
    },
  );

  return getCachedShortcuts();
}
