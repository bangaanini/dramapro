import { unstable_cache } from "next/cache";

import {
  getCatalogFeedPage,
  getHomeCatalogData,
  type CatalogProviderTab,
  type CatalogSeriesCard,
} from "@/lib/catalog";

export type HomeFeedEntry = CatalogSeriesCard;
export type HomeProviderTab = CatalogProviderTab;

export const getHomepageCatalogData = unstable_cache(
  async () => getHomeCatalogData(),
  ["catalog-homepage-streamapi-v3-provider-tabs"],
  {
    revalidate: 300,
    tags: ["catalog-home"],
  },
);

export async function getHomepageFeedPage(
  offset: number,
  limit: number,
  platformId?: string | null,
) {
  return getCatalogFeedPage(offset, limit, { platformId });
}
