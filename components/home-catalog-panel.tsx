import { Sparkles } from "lucide-react";

import { HomeFeedTabs } from "@/components/home-feed-tabs";
import { Card, CardContent } from "@/components/ui/card";
import type { HomeFeedEntry } from "@/lib/catalog-data";

type HomeCatalogResponse = {
  totalDramas: number;
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
      {data.totalDramas === 0 ? (
        <section className="mx-auto mt-5 w-full max-w-7xl px-3 sm:mt-6 sm:px-4 lg:px-6">
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
        <HomeFeedTabs
          homeEntries={data.homeEntries}
          homeTotal={data.homeTotal}
          newEntries={data.newEntries}
          newTotal={data.newTotal}
          popularEntries={data.popularEntries}
          popularTotal={data.popularTotal}
        />
      )}
    </>
  );
}
