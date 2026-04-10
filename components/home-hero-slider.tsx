"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HomeHeroSlide } from "@/lib/catalog-data";
import { cn, formatProviderName, shouldBypassImageOptimization } from "@/lib/utils";

type HomeHeroSliderProps = {
  slides: HomeHeroSlide[];
};

const SLIDE_INTERVAL_MS = 6500;

export function HomeHeroSlider({ slides }: HomeHeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const resolvedIndex = activeIndex % slides.length;
  const currentSlide = slides[resolvedIndex];
  const featuredDrama = currentSlide.items[0];

  function moveTo(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  return (
    <section className="relative mt-10 overflow-hidden rounded-[2.2rem] border border-white/8 bg-black/30">
      <div className="absolute inset-0">
        {featuredDrama?.thumbUrl ? (
          <Image
            src={featuredDrama.thumbUrl}
            alt={featuredDrama.title}
            fill
            priority
            className="object-cover opacity-78"
            sizes="100vw"
            unoptimized={shouldBypassImageOptimization(featuredDrama.thumbUrl)}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,152,98,0.34),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(9,7,7,0.92)_18%,rgba(9,7,7,0.64)_56%,rgba(9,7,7,0.82)_100%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(188,87,255,0.12),transparent_62%)]" />
      </div>

      <div className="relative px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                <Flame className="mr-2 size-3.5" />
                Hero picks
              </Badge>
              <Badge className="border-white/10 bg-black/30 text-white backdrop-blur">
                {formatProviderName(currentSlide.providerName)}
              </Badge>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/55">
                Dua drama populer teratas dari provider ini
              </p>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {featuredDrama?.title ?? "Popular spotlight"}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-white/72 sm:text-base">
                Jelajahi drama populer dari {formatProviderName(currentSlide.providerName)}{" "}
                dengan tampilan discovery yang lebih fokus, cepat, dan siap ditonton.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {featuredDrama ? (
                <Link href={featuredDrama.href} prefetch>
                  <Button size="lg" className="h-11 rounded-full px-5">
                    <PlayCircle className="mr-2 size-4.5" />
                    Tonton sekarang
                  </Button>
                </Link>
              ) : null}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/70 backdrop-blur">
                <span className="font-medium text-white">
                  {resolvedIndex + 1}
                </span>
                <span>/</span>
                <span>{slides.length}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {currentSlide.items.map((item, index) => (
              <Link
                key={`${currentSlide.providerName}-${item.id}`}
                href={item.href}
                prefetch
                className="group"
              >
                <div
                  className={cn(
                    "relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,21,20,0.94),rgba(17,13,13,0.94))] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.3)] transition duration-300 hover:-translate-y-1 hover:border-accent/35",
                    index === 0 && "border-accent/20 bg-[linear-gradient(180deg,rgba(49,26,21,0.96),rgba(17,13,13,0.94))]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-24 w-18 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-white/5">
                      {item.thumbUrl ? (
                        <Image
                          src={item.thumbUrl}
                          alt={item.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-[1.05]"
                          sizes="96px"
                          unoptimized={shouldBypassImageOptimization(item.thumbUrl)}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-white/40">
                          No Cover
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Badge className="border-white/10 bg-white/7 text-white">
                        #{index + 1} popular
                      </Badge>
                      <h3 className="line-clamp-2 text-base font-semibold leading-6 text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-white/62">
                        {item.episodeCount > 0
                          ? `${item.episodeCount} episodes`
                          : "Episode info unavailable"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.providerName}
                  type="button"
                  onClick={() => moveTo(index)}
                  aria-label={`Buka slide ${formatProviderName(slide.providerName)}`}
                  className={cn(
                    "h-2.5 rounded-full transition",
                    index === resolvedIndex
                      ? "w-9 bg-white"
                      : "w-2.5 bg-white/30 hover:bg-white/45",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveTo(resolvedIndex - 1)}
                aria-label="Slide sebelumnya"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/78 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => moveTo(resolvedIndex + 1)}
                aria-label="Slide berikutnya"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/78 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
