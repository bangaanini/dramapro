"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import type { HomeFeedEntry } from "@/lib/catalog-data";
import { triggerSelectionHaptic } from "@/lib/haptics";
import {
  filterVisibleDisplayTags,
  normalizeDisplayImageUrl,
  shouldBypassImageOptimization,
} from "@/lib/utils";

type HomeHeroSliderProps = {
  entries: HomeFeedEntry[];
};

export function HomeHeroSlider({ entries }: HomeHeroSliderProps) {
  const safeEntries = useMemo(() => entries.slice(0, 10), [entries]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const activeEntry = safeEntries[activeIndex];
  const activeThumbUrl = activeEntry
    ? normalizeDisplayImageUrl(activeEntry.thumbUrl)
    : "";
  const displayTags = activeEntry ? filterVisibleDisplayTags(activeEntry.tags) : [];
  const visibleTags = displayTags.slice(0, 3);
  const hiddenTagCount = Math.max(0, displayTags.length - visibleTags.length);

  useEffect(() => {
    if (safeEntries.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeEntries.length);
    }, 5200);

    return () => {
      window.clearInterval(interval);
    };
  }, [safeEntries.length]);

  if (!activeEntry) {
    return null;
  }

  function moveSlide(direction: 1 | -1) {
    if (safeEntries.length <= 1) {
      return;
    }

    setActiveIndex((current) =>
      (current + direction + safeEntries.length) % safeEntries.length,
    );
  }

  return (
    <section className="w-full px-0 pb-8 pt-6 lg:pb-5 lg:pt-0">
      <div
        className="relative mx-0 h-[300px] w-full max-w-none overflow-hidden border-b border-white/7 bg-black/24 min-[390px]:h-[320px] sm:h-[410px] lg:grid lg:h-[535px] lg:grid-cols-[minmax(0,1.04fr)_minmax(470px,0.96fr)] lg:items-center lg:border-y lg:border-x-0 lg:border-white/8 lg:bg-[#050507] lg:px-4 lg:shadow-[0_26px_90px_rgba(0,0,0,0.46)]"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touchRef.current;
          const touch = event.changedTouches[0];
          touchRef.current = null;

          if (!start || !touch) {
            return;
          }

          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;

          if (Math.abs(deltaX) > 46 && Math.abs(deltaX) > Math.abs(deltaY)) {
            moveSlide(deltaX < 0 ? 1 : -1);
          }
        }}
      >
        {activeThumbUrl ? (
          <Image
            src={activeThumbUrl}
            alt=""
            fill
            className="hidden scale-110 object-cover opacity-24 blur-3xl lg:block"
            sizes="100vw"
            unoptimized={shouldBypassImageOptimization(activeThumbUrl)}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_31%_45%,rgba(255,122,69,0.16),transparent_31%),linear-gradient(90deg,rgba(255,255,255,0.04),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.82))]" />
        <div className="relative h-full overflow-hidden lg:min-w-0 lg:rounded-l-[1.35rem]">
          {safeEntries.map((entry, index) => {
            const displayThumbUrl = normalizeDisplayImageUrl(entry.thumbUrl);
            let offset = index - activeIndex;

            if (offset > safeEntries.length / 2) {
              offset -= safeEntries.length;
            } else if (offset < -safeEntries.length / 2) {
              offset += safeEntries.length;
            }

            const isActive = offset === 0;
            const isVisible = Math.abs(offset) <= 2;

            return (
              <Link
                key={`${entry.id}-${index}`}
                href={`/watch/${entry.id}`}
                prefetch
                onClick={() => triggerSelectionHaptic()}
                className="absolute left-1/2 top-1/2 w-[42vw] min-w-[148px] max-w-[230px] [--slide-step:clamp(168px,47vw,310px)] lg:w-[13vw] lg:min-w-[176px] lg:max-w-[244px] lg:[--slide-step:clamp(142px,14vw,235px)] xl:min-w-[190px] xl:max-w-[258px] xl:[--slide-step:clamp(160px,13vw,250px)]"
                aria-label={`Tonton ${entry.title}`}
                style={{
                  opacity: isVisible ? (isActive ? 1 : 0.58) : 0,
                  pointerEvents: isVisible ? "auto" : "none",
                  transform: `translate(-50%, -50%) translateX(calc(${offset} * var(--slide-step))) scale(${isActive ? 1 : 0.84})`,
                  transition:
                    "transform 520ms cubic-bezier(0.22,1,0.36,1), opacity 520ms ease",
                  zIndex: 10 - Math.abs(offset),
                }}
              >
                <article className="relative aspect-[3/4] overflow-hidden rounded-[1.35rem] bg-white/6 shadow-[0_26px_74px_rgba(0,0,0,0.5)] ring-1 ring-white/16">
                  {displayThumbUrl ? (
                    <Image
                      src={displayThumbUrl}
                      alt={entry.title}
                      fill
                      priority={index === 0}
                      className="object-contain"
                      sizes="(max-width: 640px) 42vw, 260px"
                      unoptimized={shouldBypassImageOptimization(displayThumbUrl)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/58">
                      No Cover
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/88 via-black/24 to-transparent" />
                </article>
              </Link>
            );
          })}
        </div>

        <div className="relative z-20 hidden min-w-0 pl-8 pr-8 lg:block">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(255,122,69,0.35)]">
              Top Trending
            </span>
            <span className="rounded-md border border-white/16 bg-white/6 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/72">
              Full HD
            </span>
          </div>

          <h1 className="mt-4 line-clamp-2 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
            {activeEntry.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/72"
              >
                {tag}
              </span>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="rounded-md border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/72">
                +{hiddenTagCount}
              </span>
            ) : null}
          </div>

          <p className="mt-8 max-w-3xl border-l-2 border-accent pl-5 text-base leading-8 text-white/62">
            {activeEntry.description ||
              `Drama pilihan terbaru dari ${activeEntry.platformName}. Tonton kisah seru dengan subtitle Indonesia kualitas HD.`}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href={`/watch/${activeEntry.id}/play?episode=1`}
              prefetch
              onClick={() => triggerSelectionHaptic()}
              className="inline-flex h-14 min-w-56 items-center justify-center gap-3 rounded-xl bg-accent px-7 text-base font-semibold text-white shadow-[0_18px_48px_rgba(255,122,69,0.34)] transition hover:brightness-110 active:scale-[0.985]"
            >
              <Play className="size-5 fill-current" />
              Putar Sekarang
            </Link>
            <Link
              href={`/watch/${activeEntry.id}`}
              prefetch
              className="inline-flex h-14 min-w-36 items-center justify-center rounded-xl border border-white/10 bg-white/7 px-7 text-base font-semibold text-white/86 transition hover:bg-white/11 active:scale-[0.985]"
            >
              Detail Info
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-30 mx-auto mt-5 flex w-full max-w-3xl flex-col items-center px-5 lg:hidden">
        <h1 className="line-clamp-2 min-h-[3rem] text-center text-xl font-semibold leading-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] sm:text-2xl">
          {activeEntry.title}
        </h1>
        <Link
          href={`/watch/${activeEntry.id}`}
          prefetch
          onClick={() => triggerSelectionHaptic()}
          className="mt-4 inline-flex h-14 w-full max-w-[640px] items-center justify-center gap-3 rounded-full bg-accent px-6 text-base font-semibold text-white shadow-[0_18px_48px_rgba(255,122,69,0.35)] transition active:scale-[0.985] sm:w-auto sm:min-w-[360px]"
        >
          <Play className="size-5 fill-current" />
          Tonton Sekarang
        </Link>
        <div className="mt-4 flex items-center justify-center gap-2">
          {safeEntries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              aria-label={`Slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={
                index === activeIndex
                  ? "h-2.5 w-7 rounded-full bg-accent"
                  : "size-2.5 rounded-full bg-white/28"
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
