"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { HomeFeedSection } from "@/components/home-feed-section";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import { Card, CardContent } from "@/components/ui/card";
import type { HomeFeedEntry, HomeHeroSlide } from "@/lib/catalog-data";
import { safeSessionStorage } from "@/lib/safe-session-storage";

type HomeCatalogResponse = {
  totalDramas: number;
  heroSlides: HomeHeroSlide[];
  homeEntries: HomeFeedEntry[];
  homeTotal: number;
  newEntries: HomeFeedEntry[];
  newTotal: number;
  popularEntries: HomeFeedEntry[];
  popularTotal: number;
};
const HOME_CATALOG_CACHE_KEY = "dramapro.home-catalog";

export function HomeCatalogPanel() {
  const [data, setData] = useState<HomeCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cachedCatalog =
      safeSessionStorage.getJSON<HomeCatalogResponse>(HOME_CATALOG_CACHE_KEY);

    if (cachedCatalog) {
      setData(cachedCatalog);
      setIsLoading(false);
    }

    async function loadCatalog() {
      try {
        const response = await fetch("/api/catalog/home", {
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error("Gagal memuat katalog beranda.");
        }

        const payload = (await response.json()) as HomeCatalogResponse;

        if (!isMounted) {
          return;
        }

        setData(payload);
        safeSessionStorage.setJSON(HOME_CATALOG_CACHE_KEY, payload);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (!cachedCatalog) {
          setData(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat katalog beranda.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <>
        <section className="mt-10">
          <Card className="glass-panel overflow-hidden rounded-[2rem] border-white/10">
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center sm:p-7">
              <div className="rounded-full border border-white/10 bg-white/5 p-3">
                <LoaderCircle className="size-6 animate-spin text-accent" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-white">Menyiapkan hero slider</p>
                <p className="max-w-md text-sm text-[var(--muted)]">
                  Sorotan drama populer dari tiap provider sedang dimuat agar
                  beranda terasa lebih premium dan ringan.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="mt-8">
          <Card className="glass-panel rounded-[1.75rem]">
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                <LoaderCircle className="size-8 animate-spin text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  Menyiapkan katalog
                </h3>
                <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
                  Metadata lokal sedang dimuat supaya beranda tetap ringan saat
                  dibuka.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <section className="mt-8">
          <Card className="glass-panel rounded-[1.75rem]">
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                <Sparkles className="size-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  Katalog belum bisa dimuat
                </h3>
                <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
                  {error ?? "Terjadi kendala saat memuat katalog beranda."}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </>
    );
  }

  return (
    <>
      <HomeHeroSlider slides={data.heroSlides} />

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
