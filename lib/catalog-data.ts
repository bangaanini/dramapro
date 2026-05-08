import { unstable_cache } from "next/cache";

import {
  getCatalogFeedPage,
  getHomeCatalogData,
  getHomeShowcaseData,
  type CatalogProviderTab,
  type CatalogSeriesCard,
  type HomeShowcaseData,
} from "@/lib/catalog";

export type HomeFeedEntry = CatalogSeriesCard;
export type HomeProviderTab = CatalogProviderTab;
export type HomeShowcasePayload = HomeShowcaseData;

export const getHomepageCatalogData = unstable_cache(
  async () => getHomeCatalogData(),
  ["catalog-homepage-streamapi-v3-provider-tabs"],
  {
    revalidate: 300,
    tags: ["catalog-home"],
  },
);

export const getHomepageShowcaseData = unstable_cache(
  async () => getHomeShowcaseData(),
  ["catalog-homepage-showcase-streamapi-v2"],
  {
    revalidate: 180,
    tags: ["catalog-home"],
  },
);

export async function getHomepageFeedPage(
  offset: number,
  limit: number,
  options?: {
    platformId?: string | null;
    tag?: string | null;
    sort?: "latest" | "popular" | null;
  },
) {
  return getCatalogFeedPage(offset, limit, options);
}
