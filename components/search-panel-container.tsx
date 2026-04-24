import { SearchPanel } from "@/components/search-panel";
import { getCatalogShortcuts } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export async function SearchPanelContainer() {
  const [shortcuts, filters] = await Promise.all([
    getCatalogShortcuts().catch(() => ({
      filters: [],
      tags: [],
    })),
    prisma.catalogTab
      .findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          name: true,
        },
        orderBy: [{ positionIndex: "asc" }, { sortOrder: "asc" }],
        take: 48,
      })
      .catch(() => []),
  ]);

  return <SearchPanel filters={filters} tags={shortcuts.tags} />;
}
