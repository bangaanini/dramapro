"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { DramaCard } from "@/components/drama-card";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HomeFeedEntry = {
  id: string;
  href: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
};

type FeedTabKey = "new" | "popular" | "home";

type FeedTabConfig = {
  key: FeedTabKey;
  label: string;
  badgeLabel: string | null;
  emptyCopy: string;
};

type FeedResponse = {
  entries: HomeFeedEntry[];
  total: number;
  nextOffset: number;
  hasMore: boolean;
};

type FeedState = {
  entries: HomeFeedEntry[];
  total: number;
  nextOffset: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
};

type HomeFeedTabsProps = {
  homeEntries: HomeFeedEntry[];
  homeTotal: number;
  newEntries: HomeFeedEntry[];
  newTotal: number;
  popularEntries: HomeFeedEntry[];
  popularTotal: number;
};

const FEED_PAGE_SIZE = 18;

function createInitialFeedState(
  entries: HomeFeedEntry[],
  total: number,
): FeedState {
  return {
    entries,
    total,
    nextOffset: entries.length,
    hasMore: entries.length < total,
    isLoading: false,
    error: null,
  };
}

function mergeFeedEntries(
  currentEntries: HomeFeedEntry[],
  nextEntries: HomeFeedEntry[],
) {
  const seenIds = new Set(currentEntries.map((entry) => entry.id));
  const mergedEntries = [...currentEntries];

  for (const entry of nextEntries) {
    if (seenIds.has(entry.id)) {
      continue;
    }

    seenIds.add(entry.id);
    mergedEntries.push(entry);
  }

  return mergedEntries;
}

export function HomeFeedTabs({
  homeEntries,
  homeTotal,
  newEntries,
  newTotal,
  popularEntries,
  popularTotal,
}: HomeFeedTabsProps) {
  const [activeTab, setActiveTab] = useState<FeedTabKey>("new");
  const [feeds, setFeeds] = useState<Record<FeedTabKey, FeedState>>({
    home: createInitialFeedState(homeEntries, homeTotal),
    new: createInitialFeedState(newEntries, newTotal),
    popular: createInitialFeedState(popularEntries, popularTotal),
  });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const feedsRef = useRef(feeds);

  useEffect(() => {
    feedsRef.current = feeds;
  }, [feeds]);

  const tabs: FeedTabConfig[] = useMemo(
    () => [
      {
        key: "new",
        label: "Terbaru",
        badgeLabel: "NEW",
        emptyCopy: "Belum ada drama terbaru. Jalankan sync feed new dari panel admin.",
      },
      {
        key: "popular",
        label: "Populer",
        badgeLabel: "HOT",
        emptyCopy:
          "Belum ada drama populer. Jalankan sync feed populer dari panel admin.",
      },
      {
        key: "home",
        label: "Untukmu",
        badgeLabel: null,
        emptyCopy:
          "Belum ada rekomendasi. Jalankan sync feed home dari panel admin.",
      },
    ],
    [],
  );

  const currentTab =
    tabs.find((tab) => tab.key === activeTab) ??
    tabs[0];
  const currentFeed = feeds[currentTab.key];

  const loadMore = useCallback(async (tabKey: FeedTabKey) => {
    const currentFeedState = feedsRef.current[tabKey];

    if (
      currentFeedState.isLoading ||
      !currentFeedState.hasMore
    ) {
      return;
    }

    setFeeds((current) => ({
      ...current,
      [tabKey]: {
        ...current[tabKey],
        isLoading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(
        `/api/catalog/feed?source=${encodeURIComponent(tabKey)}&offset=${currentFeedState.nextOffset}&limit=${FEED_PAGE_SIZE}`,
        {
          credentials: "same-origin",
        },
      );

      const payload = (await response.json()) as FeedResponse | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Gagal memuat katalog berikutnya.",
        );
      }

      const nextPage = payload as FeedResponse;

      setFeeds((current) => {
        const activeFeed = current[tabKey];
        const mergedEntries = mergeFeedEntries(activeFeed.entries, nextPage.entries);

        return {
          ...current,
          [tabKey]: {
            entries: mergedEntries,
            total: nextPage.total,
            nextOffset: nextPage.nextOffset,
            hasMore: nextPage.hasMore,
            isLoading: false,
            error: null,
          },
        };
      });
    } catch (loadError) {
      setFeeds((current) => ({
        ...current,
        [tabKey]: {
          ...current[tabKey],
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat katalog berikutnya.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !currentFeed.hasMore || currentFeed.isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (!firstEntry?.isIntersecting) {
          return;
        }

        void loadMore(currentTab.key);
      },
      {
        rootMargin: "900px 0px 900px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [currentFeed.hasMore, currentFeed.isLoading, currentTab.key, loadMore]);

  return (
    <section className="mx-auto mt-0 w-full max-w-7xl space-y-4 px-3 pb-2 sm:px-4 lg:px-6">
      <div className="sticky top-[3.9rem] z-40 -mx-3 border-b border-white/7 bg-[linear-gradient(180deg,rgba(15,10,10,0.98),rgba(15,10,10,0.9)_72%,rgba(15,10,10,0.78))] px-3 pb-2 pt-2 backdrop-blur-2xl shadow-[0_10px_24px_rgba(0,0,0,0.18)] sm:top-[4.2rem] sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[rgba(15,10,10,0.42)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative shrink-0 pb-2 text-sm font-semibold transition",
                  activeTab === tab.key
                    ? "text-white"
                    : "text-white/45 hover:text-white/80",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.45)] transition",
                    activeTab === tab.key ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
            {currentFeed.total} judul
          </span>
        </div>
      </div>

      {currentFeed.entries.length === 0 ? (
        <Card className="glass-panel rounded-[1.4rem] border-white/10">
          <CardContent className="flex min-h-36 items-center justify-center px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            {currentTab.emptyCopy}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {currentFeed.entries.map((entry) => (
              <DramaCard
                key={`${currentTab.key}-${entry.id}`}
                href={entry.href}
                title={entry.title}
                thumbUrl={entry.thumbUrl}
                providerName={entry.providerName}
                episodeCount={entry.episodeCount}
                compact
                hideCta
                cornerLabel={currentTab.badgeLabel}
              />
            ))}
          </div>

          <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

          {currentFeed.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-[var(--muted-foreground)]">
              <LoaderCircle className="size-4 animate-spin text-accent" />
              Memuat judul berikutnya...
            </div>
          ) : null}

          {currentFeed.error ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-center text-sm text-red-200">{currentFeed.error}</p>
              <button
                type="button"
                onClick={() => {
                  void loadMore(currentTab.key);
                }}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Coba lagi
              </button>
            </div>
          ) : null}

          {currentFeed.hasMore && !currentFeed.isLoading ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => {
                  void loadMore(currentTab.key);
                }}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Muat lagi
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
