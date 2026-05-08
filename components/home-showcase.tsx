import { DramaCard } from "@/components/drama-card";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import type { HomeShowcasePayload } from "@/lib/catalog-data";

export function HomeShowcase({ data }: { data: HomeShowcasePayload }) {
  const popularEntries = data.popularEntries.slice(0, 10);

  if (data.heroEntries.length === 0 && popularEntries.length === 0) {
    return (
      <section className="mx-auto mt-15 w-full max-w-[1580px] px-4 pb-8 sm:px-6 lg:px-10">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-sm text-[var(--muted)]">
          Belum ada judul drama di database. Jalankan sinkronisasi katalog dari panel admin.
        </div>
      </section>
    );
  }

  return (
    <>
      <HomeHeroSlider entries={data.heroEntries} />

      <section className="mx-auto w-full max-w-[1580px] px-4 pb-8 pt-6 sm:px-6 lg:px-10">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Serial Populer
        </h2>

        <div className="relative mt-4">
          <div className="pointer-events-none absolute inset-y-0 -left-4 z-10 w-16 bg-[#080504]/10 backdrop-blur-md [mask-image:linear-gradient(to_right,black,transparent)] sm:-left-6 lg:-left-10" />
          <div className="pointer-events-none absolute inset-y-0 -right-4 z-10 w-16 bg-[#080504]/10 backdrop-blur-md [mask-image:linear-gradient(to_left,black,transparent)] sm:-right-6 lg:-right-10" />
          <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-4 sm:gap-5 lg:gap-6">
              {popularEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="w-[146px] shrink-0 sm:w-[174px] lg:w-[190px]"
                >
                  <DramaCard
                    href={`/watch/${entry.id}`}
                    title={entry.title}
                    thumbUrl={entry.thumbUrl}
                    providerName={entry.platformName}
                    episodeCount={entry.episodeCount}
                    hideCta
                    compact
                    hideCompactMeta
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
