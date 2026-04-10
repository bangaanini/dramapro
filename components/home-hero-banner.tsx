import Image from "next/image";
import Link from "next/link";
import { Flame, PlayCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { HomeFeedEntry } from "@/lib/catalog-data";
import {
  cn,
  formatProviderName,
  normalizeDisplayImageUrl,
  shouldBypassImageOptimization,
} from "@/lib/utils";

type HomeHeroBannerProps = {
  items: HomeFeedEntry[];
};

export function HomeHeroBanner({ items }: HomeHeroBannerProps) {
  if (items.length === 0) {
    return null;
  }

  const [featuredItem, ...secondaryItems] = items;
  const featuredThumbUrl = normalizeDisplayImageUrl(featuredItem.thumbUrl);
  const synopsis =
    featuredItem.description.trim() ||
    "Drama paling ramai lintas provider dengan episode lengkap dan siap kamu putar sekarang.";

  return (
    <section className="relative mt-10 overflow-hidden rounded-[2.2rem] border border-white/8 bg-black/30">
      <div className="absolute inset-0">
        {featuredThumbUrl ? (
          <Image
            src={featuredThumbUrl}
            alt={featuredItem.title}
            fill
            priority
            className="object-cover opacity-78"
            sizes="100vw"
            unoptimized={shouldBypassImageOptimization(featuredThumbUrl)}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,152,98,0.28),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(9,7,7,0.94)_16%,rgba(9,7,7,0.68)_56%,rgba(9,7,7,0.84)_100%)]" />
      </div>

      <div className="relative px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <Flame className="mr-2 size-3.5" />
                Drama pilihan hari ini
              </Badge>
              <Badge className="border-white/10 bg-black/30 text-white backdrop-blur">
                {formatProviderName(featuredItem.providerName)}
              </Badge>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/55">
                Peringkat #1 lintas provider
              </p>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {featuredItem.title}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-white/72 sm:text-base">
                {synopsis}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={featuredItem.href}
                prefetch
                className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-5")}
              >
                <PlayCircle className="mr-2 size-4.5" />
                Tonton sekarang
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/70 backdrop-blur">
                <Sparkles className="size-4 text-accent" />
                <span>
                  {featuredItem.watchValue
                    ? `${featuredItem.watchValue} tayangan • ${featuredItem.episodeCount} episode`
                    : `${featuredItem.episodeCount} episode tersedia`}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {secondaryItems.map((item, index) => (
              <Link key={item.id} href={item.href} prefetch className="group">
                <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,21,20,0.94),rgba(17,13,13,0.94))] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.3)] transition duration-300 hover:-translate-y-1 hover:border-accent/35">
                  <div className="flex items-center gap-3">
                    <div className="relative h-24 w-18 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-white/5">
                      {normalizeDisplayImageUrl(item.thumbUrl) ? (
                        <Image
                          src={normalizeDisplayImageUrl(item.thumbUrl)}
                          alt={item.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.05]"
                          sizes="96px"
                          unoptimized={shouldBypassImageOptimization(
                            normalizeDisplayImageUrl(item.thumbUrl),
                          )}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                          No Cover
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Badge className="border-white/10 bg-white/7 text-white">
                        #{index + 2} teratas
                      </Badge>
                      <h3 className="line-clamp-2 text-base font-semibold leading-6 text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-white/62">
                        {formatProviderName(item.providerName)} •{" "}
                        {item.watchValue
                          ? `${item.watchValue} tayangan`
                          : item.episodeCount > 0
                            ? `${item.episodeCount} episode`
                            : "Belum ada data episode"}
                      </p>
                      <p className="line-clamp-2 text-xs leading-5 text-white/48">
                        {item.description.trim() ||
                          "Drama populer yang sedang naik di katalog lintas provider."}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
