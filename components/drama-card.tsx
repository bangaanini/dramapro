"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { triggerSelectionHaptic } from "@/lib/haptics";
import {
  normalizeDisplayImageUrl,
  shouldBypassImageOptimization,
} from "@/lib/utils";

type DramaCardProps = {
  href: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
  ctaLabel?: string;
  extraMeta?: string | null;
  hideCta?: boolean;
  compact?: boolean;
  cornerLabel?: string | null;
  hideCompactMeta?: boolean;
};

export function DramaCard({
  href,
  title,
  thumbUrl,
  episodeCount,
  ctaLabel = "Lihat detail",
  extraMeta,
  hideCta = false,
  compact = false,
  cornerLabel,
  hideCompactMeta = false,
}: DramaCardProps) {
  const router = useRouter();
  const displayThumbUrl = normalizeDisplayImageUrl(thumbUrl);
  const prefetchDetail = () => {
    router.prefetch(href);
  };

  if (compact) {
    return (
      <Link
        href={href}
        prefetch
        onMouseEnter={prefetchDetail}
        onFocus={prefetchDetail}
        onTouchStart={prefetchDetail}
        onPointerDown={() => {
          prefetchDetail();
          triggerSelectionHaptic();
        }}
        className="group block"
      >
        <article className="transition duration-300 active:scale-[0.985] hover:-translate-y-0.5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[0.65rem] bg-white/5 shadow-[0_14px_32px_rgba(0,0,0,0.26)] ring-1 ring-white/8">
            {displayThumbUrl ? (
              <Image
                src={displayThumbUrl}
                alt={title}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 31vw, (max-width: 1024px) 24vw, 16vw"
                unoptimized={shouldBypassImageOptimization(displayThumbUrl)}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#2e1c18,#1a1110)] text-[11px] text-[var(--muted-foreground)]">
                No Cover
              </div>
            )}

            <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
              {cornerLabel ? (
                <span className="rounded-md bg-[var(--accent)] px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_20px_rgba(255,122,69,0.3)]">
                  {cornerLabel}
                </span>
              ) : (
                <span />
              )}
            </div>
          </div>
          <div className="px-0.5 pt-2 text-center">
            <h3 className="line-clamp-2 min-h-[2.45rem] text-[13px] font-semibold leading-5 text-white sm:text-sm">
              {title}
            </h3>
            {!hideCompactMeta && extraMeta ? (
              <p className="mt-1 line-clamp-1 text-[10px] text-white/54">
                {extraMeta}
              </p>
            ) : !hideCompactMeta && episodeCount > 0 ? (
              <p className="mt-1 text-[10px] text-white/54">{episodeCount} eps</p>
            ) : null}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
      onTouchStart={prefetchDetail}
      onPointerDown={() => {
        prefetchDetail();
        triggerSelectionHaptic();
      }}
      className="group"
    >
      <Card className="glass-panel h-full overflow-hidden rounded-[1.6rem] border-white/8 transition duration-300 active:scale-[0.985] hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
        <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
          {displayThumbUrl ? (
            <Image
              src={displayThumbUrl}
              alt={title}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.05]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              unoptimized={shouldBypassImageOptimization(displayThumbUrl)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#2e1c18,#1a1110)] text-sm text-[var(--muted-foreground)]">
              No Cover
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-white">
              {title}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              {episodeCount > 0 ? `${episodeCount} episodes` : "Episode info unavailable"}
            </p>
            {extraMeta ? (
              <p className="line-clamp-1 text-[11px] text-[var(--muted-foreground)]">
                {extraMeta}
              </p>
            ) : null}
          </div>
          {!hideCta ? (
            <div className={buttonVariants({ variant: "secondary", size: "sm" })}>
              {ctaLabel}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
