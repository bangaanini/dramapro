import { Sparkles } from "lucide-react";

import { HomeFeedSection } from "@/components/home-feed-section";
import { HomeHeroBanner } from "@/components/home-hero-banner";
import { Card, CardContent } from "@/components/ui/card";
import type { HomeFeedEntry } from "@/lib/catalog-data";

type HomeCatalogResponse = {
  totalDramas: number;
  heroBanners: HomeFeedEntry[];
  homeEntries: HomeFeedEntry[];
  homeTotal: number;
  newEntries: HomeFeedEntry[];
  newTotal: number;
  popularEntries: HomeFeedEntry[];
  popularTotal: number;
};

export function HomeCatalogPanel({ data }: { data: HomeCatalogResponse }) {
  return (
    <>
      <HomeHeroBanner items={data.heroBanners} />

      {data.totalDramas === 0 ? (
        <section className="mt-8">
          <Card className="glass-panel rounded-[1.75rem]">
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                <Sparkles className="size-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  Your library is empty
                </h3>
                <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
                  Jalankan sync feed home, new, atau popular dari panel admin
                  untuk mengisi section beranda.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <>
          <HomeFeedSection
            title="Rekomendasi Untukmu"
            description="Koleksi drama untukmu"
            entries={data.homeEntries}
            total={data.homeTotal}
            source="home"
          />
          <HomeFeedSection
            title="New Releases"
            description="Drama terbaru."
            entries={data.newEntries}
            total={data.newTotal}
            source="new"
          />
          <HomeFeedSection
            title="Populer"
            description="Drama populer"
            entries={data.popularEntries}
            total={data.popularTotal}
            source="popular"
          />
        </>
      )}
    </>
  );
}
