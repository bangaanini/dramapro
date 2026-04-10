"use client";

import { useState } from "react";

import { DramaCard } from "@/components/drama-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SyncSource } from "@/lib/provider-adapter";

const FEED_PAGE_SIZE = 12;

export type HomeFeedEntry = {
  id: string;
  href: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
};

type HomeFeedSectionProps = {
  title: string;
  description: string;
  entries: HomeFeedEntry[];
  total: number;
  source: SyncSource;
};

export function HomeFeedSection({
  title,
  description,
  entries,
  total,
  source,
}: HomeFeedSectionProps) {
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);

  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;

  return (
    <section className="mt-10 flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
        <Badge variant="secondary">{total} titles</Badge>
      </div>

      {entries.length === 0 ? (
        <Card className="glass-panel rounded-[1.75rem]">
          <CardContent className="flex min-h-40 items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
            Feed ini masih kosong. Jalankan sync source{" "}
            <span className="mx-1 font-medium text-white">{source}</span>
            dari panel admin.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {visibleEntries.map((entry) => (
              <DramaCard
                key={`${source}-${entry.id}`}
                href={entry.href}
                title={entry.title}
                thumbUrl={entry.thumbUrl}
                providerName={entry.providerName}
                episodeCount={entry.episodeCount}
              />
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="default"
                onClick={() =>
                  setVisibleCount((current) =>
                    Math.min(current + FEED_PAGE_SIZE, entries.length),
                  )
                }
              >
                Load more {title.toLowerCase()}
              </Button>
            </div>
          ) : total > entries.length ? (
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              Menampilkan {entries.length} judul pertama dari {total} total hasil
              sync.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
