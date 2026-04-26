import { HomeCatalogGrid } from "@/components/home-catalog-grid";
import type { HomeFeedEntry, HomeProviderTab } from "@/lib/catalog-data";

type CatalogHomePayload = {
  initialFeed: {
    entries: HomeFeedEntry[];
    total: number;
    nextOffset: number;
    hasMore: boolean;
  };
  providerTabs: HomeProviderTab[];
  stats: {
    totalSeries: number;
    totalEpisodes: number;
  };
};

export function HomeCatalogPanel({ data }: { data: CatalogHomePayload }) {
  return <HomeCatalogGrid data={data} />;
}
