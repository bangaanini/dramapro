import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  formatProviderName,
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
};

export function DramaCard({
  href,
  title,
  thumbUrl,
  providerName,
  episodeCount,
  ctaLabel = "Lihat detail",
  extraMeta,
  hideCta = false,
  compact = false,
  cornerLabel,
}: DramaCardProps) {
  const displayThumbUrl = normalizeDisplayImageUrl(thumbUrl);

  if (compact) {
    return (
      <Link href={href} className="group block">
        <article className="overflow-hidden rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(34,22,20,0.96),rgba(14,10,10,0.98))] shadow-[0_14px_36px_rgba(0,0,0,0.26)] transition duration-300 hover:-translate-y-0.5 hover:border-accent/28">
          <div className="relative aspect-[0.74] overflow-hidden bg-white/5">
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

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/62 to-transparent" />

            <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
              {cornerLabel ? (
                <span className="rounded-md bg-[var(--accent)] px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_20px_rgba(255,122,69,0.3)]">
                  {cornerLabel}
                </span>
              ) : (
                <span />
              )}
              <Badge className="border-white/10 bg-black/50 px-2 py-0.5 text-[9px] text-white backdrop-blur">
                {formatProviderName(providerName)}
              </Badge>
            </div>

            <div className="absolute inset-x-2 bottom-2 space-y-1.5">
              <h3 className="line-clamp-3 text-[13px] font-semibold leading-4.5 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
                {title}
              </h3>
              <p className="text-[11px] text-white/78">
                {episodeCount > 0 ? `${episodeCount} eps` : "Episode belum tersedia"}
              </p>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={href} className="group">
      <Card className="glass-panel h-full overflow-hidden rounded-[1.6rem] border-white/8 transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
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
          <div className="absolute left-3 top-3">
            <Badge className="border-white/10 bg-black/45 text-white backdrop-blur">
              {formatProviderName(providerName)}
            </Badge>
          </div>
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
