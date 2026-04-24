"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { DramaCard } from "@/components/drama-card";
import { Button } from "@/components/ui/button";
import type { HomeFeedEntry } from "@/lib/catalog-data";

type FeedState = {
  entries: HomeFeedEntry[];
  total: number;
  nextOffset: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
};

type HomeCatalogGridProps = {
  data: {
    initialFeed: {
      entries: HomeFeedEntry[];
      total: number;
      nextOffset: number;
      hasMore: boolean;
    };
    stats: {
      totalSeries: number;
      totalEpisodes: number;
    };
  };
};

function createInitialFeedState(
  entries: HomeFeedEntry[],
  total: number,
  nextOffset: number,
  hasMore: boolean,
): FeedState {
  return {
    entries,
    total,
    nextOffset,
    hasMore,
    isLoading: false,
    error: null,
  };
}

export function HomeCatalogGrid({ data }: HomeCatalogGridProps) {
  const [feed, setFeed] = useState<FeedState>(
    createInitialFeedState(
      data.initialFeed.entries,
      data.initialFeed.total,
      data.initialFeed.nextOffset,
      data.initialFeed.hasMore,
    ),
  );

  async function loadMore() {
    if (feed.isLoading || !feed.hasMore) {
      return;
    }

    setFeed((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch(
        `/api/catalog/feed?offset=${feed.nextOffset}&limit=18`,
      );
      const payload = (await response.json()) as Omit<FeedState, "isLoading" | "error"> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Gagal memuat halaman berikutnya.");
      }

      setFeed((current) => ({
        entries: [...current.entries, ...payload.entries],
        total: payload.total,
        nextOffset: payload.nextOffset,
        hasMore: payload.hasMore,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setFeed((current) => ({
        ...current,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat halaman berikutnya.",
      }));
    }
  }

  if (feed.entries.length === 0 && !feed.isLoading) {
    return (
      <section className="mx-auto mt-5 w-full max-w-7xl px-3 pb-8 sm:mt-6 sm:px-4 lg:px-6">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-sm text-[var(--muted)]">
          Belum ada judul drama di database. Jalankan sinkronisasi katalog dari panel admin.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-4 w-full max-w-7xl px-3 pb-8 sm:px-4 lg:px-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {feed.entries.map((entry) => (
          <DramaCard
            key={entry.id}
            href={`/watch/${entry.id}`}
            title={entry.title}
            thumbUrl={entry.thumbUrl}
            providerName={entry.platformName}
            episodeCount={entry.episodeCount}
            extraMeta={null}
            hideCta
            compact
          />
        ))}
      </div>

      {feed.error ? (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {feed.error}
        </div>
      ) : null}

      {feed.hasMore ? (
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="min-w-44 rounded-full"
            disabled={feed.isLoading}
            onClick={() => {
              void loadMore();
            }}
          >
            {feed.isLoading ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Memuat...
              </span>
            ) : (
              "Muat lebih banyak"
            )}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
