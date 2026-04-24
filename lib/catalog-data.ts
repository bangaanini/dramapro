import { unstable_cache } from "next/cache";

import {
  getCatalogFeedPage,
  getHomeCatalogData,
  type CatalogSeriesCard,
} from "@/lib/catalog";

export type HomeFeedEntry = CatalogSeriesCard;

export const getHomepageCatalogData = unstable_cache(
  async () => getHomeCatalogData(),
  ["catalog-homepage-dynamic"],
  {
    revalidate: 300,
    tags: ["catalog-home"],
  },
);

export async function getHomepageFeedPage(offset: number, limit: number) {
  return getCatalogFeedPage(offset, limit);
}
