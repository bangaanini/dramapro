"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DramaCard } from "@/components/drama-card";
import { Button } from "@/components/ui/button";
import type { HomeFeedEntry } from "@/lib/catalog-data";
import { isVisibleDisplayTag } from "@/lib/utils";

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
  tags: {
    value: string;
    count: number;
  }[];
};

type CatalogFilter =
  | { type: "all" }
  | { type: "popular" }
  | { type: "tag"; tag: string };

function createInitialFeedState(
  entries: HomeFeedEntry[],
  total: number,
  nextOffset: number,
  hasMore: boolean,
): FeedState {
  return {
    entries: uniqueFeedEntries(entries),
    total,
    nextOffset,
    hasMore,
    isLoading: false,
    error: null,
  };
}

function uniqueFeedEntries(entries: HomeFeedEntry[]) {
  const seenIds = new Set<string>();
  return entries.filter((entry) => {
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  });
}

function appendUniqueFeedEntries(currentEntries: HomeFeedEntry[], nextEntries: HomeFeedEntry[]) {
  const seenIds = new Set(currentEntries.map((entry) => entry.id));
  const uniqueNextEntries = nextEntries.filter((entry) => {
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  });

  return [...currentEntries, ...uniqueNextEntries];
}

function buildFeedUrl(offset: number, filter: CatalogFilter) {
  const params = new URLSearchParams({
    limit: "18",
    offset: String(offset),
  });

  if (filter.type === "popular") {
    params.set("sort", "popular");
  } else if (filter.type === "tag") {
    params.set("tag", filter.tag);
  }

  return `/api/catalog/feed?${params.toString()}`;
}

export function HomeCatalogGrid({ data, tags }: HomeCatalogGridProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFilters = useMemo(
    () => tags.filter((tag) => isVisibleDisplayTag(tag.value)).slice(0, 18),
    [tags],
  );
  const tagValues = useMemo(
    () => new Set(tagFilters.map((tag) => tag.value)),
    [tagFilters],
  );
  const requestedTag = searchParams.get("tag")?.trim() ?? "";
  const requestedSort = searchParams.get("sort");
  const initialFilter = useMemo<CatalogFilter>(
    () =>
      requestedTag && tagValues.has(requestedTag)
        ? { type: "tag", tag: requestedTag }
        : requestedSort === "popular"
          ? { type: "popular" }
          : { type: "all" },
    [requestedSort, requestedTag, tagValues],
  );
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>(initialFilter);
  const [feed, setFeed] = useState<FeedState>(
    initialFilter.type === "all"
      ? createInitialFeedState(
          data.initialFeed.entries,
          data.initialFeed.total,
          data.initialFeed.nextOffset,
          data.initialFeed.hasMore,
        )
      : {
          entries: [],
          total: 0,
          nextOffset: 0,
          hasMore: false,
          isLoading: true,
          error: null,
        },
  );
  const feedRequestIdRef = useRef(0);
  const initialLoadDoneRef = useRef(false);

  const replaceFilterUrl = useCallback((filter: CatalogFilter) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.delete("provider");
    nextParams.delete("platform");
    nextParams.delete("tag");
    nextParams.delete("sort");

    if (filter.type === "popular") {
      nextParams.set("sort", "popular");
    } else if (filter.type === "tag") {
      nextParams.set("tag", filter.tag);
    }

    const query = nextParams.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const loadFeedForFilter = useCallback(async (
    filter: CatalogFilter,
    shouldReplaceUrl = true,
  ) => {
    const requestId = feedRequestIdRef.current + 1;
    feedRequestIdRef.current = requestId;

    setActiveFilter(filter);
    if (shouldReplaceUrl) {
      replaceFilterUrl(filter);
    }
    setFeed({
      entries: [],
      total: 0,
      nextOffset: 0,
      hasMore: false,
      isLoading: true,
      error: null,
    });

    try {
      const response = await fetch(buildFeedUrl(0, filter));
      const payload = (await response.json()) as Omit<FeedState, "isLoading" | "error"> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Gagal memuat katalog.");
      }

      if (feedRequestIdRef.current !== requestId) {
        return;
      }

      setFeed({
        entries: uniqueFeedEntries(payload.entries),
        total: payload.total,
        nextOffset: payload.nextOffset,
        hasMore: payload.hasMore,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (feedRequestIdRef.current !== requestId) {
        return;
      }

      setFeed({
        entries: [],
        total: 0,
        nextOffset: 0,
        hasMore: false,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Gagal memuat katalog.",
      });
    }
  }, [replaceFilterUrl]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      return;
    }

    initialLoadDoneRef.current = true;

    if (initialFilter.type !== "all") {
      void loadFeedForFilter(initialFilter, false);
    }
  }, [initialFilter, loadFeedForFilter]);

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
      const response = await fetch(buildFeedUrl(feed.nextOffset, activeFilter));
      const payload = (await response.json()) as Omit<FeedState, "isLoading" | "error"> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Gagal memuat halaman berikutnya.");
      }

      setFeed((current) => ({
        entries: appendUniqueFeedEntries(current.entries, payload.entries),
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

  const showEmptyState =
    feed.entries.length === 0 &&
    !feed.isLoading &&
    !feed.error;
  const activeFilterLabel =
    activeFilter.type === "popular"
      ? "populer"
      : activeFilter.type === "tag"
        ? activeFilter.tag
        : "";

  if (showEmptyState && activeFilter.type === "all") {
    return (
      <section className="relative w-full overflow-hidden bg-[linear-gradient(180deg,rgba(8,4,3,0.72)_0%,#090504_8rem,#0b0605_100%)]">
        <div className="mx-auto mt-5 w-full max-w-[1580px] px-4 pb-8 sm:mt-6 sm:px-6 lg:px-10">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-sm text-[var(--muted)]">
            Belum ada judul drama.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-[linear-gradient(180deg,rgba(8,4,3,0.72)_0%,#090504_8rem,#0b0605_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent)]" />
      <div className="relative mx-auto w-full max-w-[1580px] px-4 pb-14 pt-8 sm:px-6 lg:px-10">
      <div className="mb-4 px-1">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          All Series
        </h2>
      </div>

      <div className="-mx-4 mb-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2">
          <FilterChip
            isActive={activeFilter.type === "all"}
            label="Semua"
            onClick={() => {
              void loadFeedForFilter({ type: "all" });
            }}
          />

          <FilterChip
            isActive={activeFilter.type === "popular"}
            label="Populer"
            onClick={() => {
              void loadFeedForFilter({ type: "popular" });
            }}
          />

          {tagFilters.map((tag) => (
            <FilterChip
              key={tag.value}
              isActive={
                activeFilter.type === "tag" && activeFilter.tag === tag.value
              }
              label={tag.value}
              onClick={() => {
                void loadFeedForFilter({ type: "tag", tag: tag.value });
              }}
            />
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 px-1 text-xs text-white/56">
        <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3">
          Urutkan
        </span>
        <button
          type="button"
          onClick={() => {
            void loadFeedForFilter({ type: "all" });
          }}
          className={
            activeFilter.type === "all"
              ? "inline-flex h-8 items-center rounded-full bg-accent px-3 font-semibold text-white"
              : "inline-flex h-8 items-center rounded-full border border-white/8 bg-white/[0.04] px-3 font-semibold text-white/70"
          }
        >
          Terbaru
        </button>
        <button
          type="button"
          onClick={() => {
            void loadFeedForFilter({ type: "popular" });
          }}
          className={
            activeFilter.type === "popular"
              ? "inline-flex h-8 items-center rounded-full bg-accent px-3 font-semibold text-white"
              : "inline-flex h-8 items-center rounded-full border border-white/8 bg-white/[0.04] px-3 font-semibold text-white/70"
          }
        >
          Populer
        </button>
      </div>

      {feed.isLoading && feed.entries.length === 0 ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-sm text-[var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Memuat katalog{activeFilterLabel ? ` ${activeFilterLabel}` : ""}...
          </span>
        </div>
      ) : showEmptyState ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-sm text-[var(--muted)]">
          Belum ada drama untuk filter ini.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-6 lg:gap-y-8">
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
              hideCompactMeta
            />
          ))}
        </div>
      )}

      {feed.error ? (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {feed.error}
        </div>
      ) : null}

      {feed.hasMore ? (
        <div className="mt-6 flex justify-center">
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
      </div>
    </section>
  );
}

function FilterChip({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isActive
          ? "inline-flex h-10 items-center gap-2 rounded-full border border-accent/50 bg-accent px-3.5 text-xs font-semibold text-white shadow-[0_16px_34px_rgba(255,122,69,0.28)] sm:h-11 sm:text-sm"
          : "inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 text-xs font-semibold text-white/82 transition hover:border-accent/35 hover:bg-white/[0.075] sm:h-11 sm:text-sm"
      }
    >
      <span>{label}</span>
    </button>
  );
}
