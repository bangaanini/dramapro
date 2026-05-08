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

type CatalogTag = {
  value: string;
  count: number;
};

export function HomeCatalogPanel({
  data,
  tags,
}: {
  data: CatalogHomePayload;
  tags: CatalogTag[];
}) {
  return <HomeCatalogGrid data={data} tags={tags} />;
}
