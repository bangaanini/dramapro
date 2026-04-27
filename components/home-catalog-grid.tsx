"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DramaCard } from "@/components/drama-card";
import { Button } from "@/components/ui/button";
import type { HomeFeedEntry, HomeProviderTab } from "@/lib/catalog-data";

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
    providerTabs: HomeProviderTab[];
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerTabs = useMemo(() => data.providerTabs ?? [], [data.providerTabs]);
  const requestedProviderId = searchParams.get("provider");
  const initialProviderId = providerTabs.some(
    (provider) => provider.id === requestedProviderId,
  )
    ? requestedProviderId
    : null;
  const [activeProviderId, setActiveProviderId] = useState<string | null>(
    initialProviderId,
  );
  const [feed, setFeed] = useState<FeedState>(
    initialProviderId
      ? {
          entries: [],
          total: 0,
          nextOffset: 0,
          hasMore: false,
          isLoading: true,
          error: null,
        }
      : createInitialFeedState(
          data.initialFeed.entries,
          data.initialFeed.total,
          data.initialFeed.nextOffset,
          data.initialFeed.hasMore,
        ),
  );
  const initialProviderLoadDoneRef = useRef(!initialProviderId);
  const feedRequestIdRef = useRef(0);
  const activeProvider = providerTabs.find(
    (provider) => provider.id === activeProviderId,
  );
  const validProviderIds = useMemo(
    () => new Set(providerTabs.map((provider) => provider.id)),
    [providerTabs],
  );

  useEffect(() => {
    if (!initialProviderId || initialProviderLoadDoneRef.current) {
      return;
    }

    initialProviderLoadDoneRef.current = true;
    const requestId = feedRequestIdRef.current + 1;
    feedRequestIdRef.current = requestId;

    async function loadInitialProviderFeed() {
      try {
        const response = await fetch(buildFeedUrl(0, initialProviderId));
        const payload = (await response.json()) as Omit<
          FeedState,
          "isLoading" | "error"
        > & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Gagal memuat katalog provider.");
        }

        if (feedRequestIdRef.current !== requestId) {
          return;
        }

        setFeed({
          entries: payload.entries,
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
            error instanceof Error
              ? error.message
              : "Gagal memuat katalog provider.",
        });
      }
    }

    void loadInitialProviderFeed();
  }, [initialProviderId]);

  function buildFeedUrl(offset: number, providerId: string | null) {
    const params = new URLSearchParams({
      limit: "18",
      offset: String(offset),
    });

    if (providerId) {
      params.set("platform", providerId);
    }

    return `/api/catalog/feed?${params.toString()}`;
  }

  function replaceProviderUrl(providerId: string | null) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (providerId) {
      nextParams.set("provider", providerId);
    } else {
      nextParams.delete("provider");
    }

    const query = nextParams.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  async function loadFeedForProvider(providerId: string | null) {
    const safeProviderId =
      providerId && validProviderIds.has(providerId) ? providerId : null;
    const requestId = feedRequestIdRef.current + 1;
    feedRequestIdRef.current = requestId;

    setActiveProviderId(safeProviderId);
    replaceProviderUrl(safeProviderId);
    setFeed({
      entries: [],
      total: 0,
      nextOffset: 0,
      hasMore: false,
      isLoading: true,
      error: null,
    });

    try {
      const response = await fetch(buildFeedUrl(0, safeProviderId));
      const payload = (await response.json()) as Omit<FeedState, "isLoading" | "error"> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Gagal memuat katalog provider.");
      }

      if (feedRequestIdRef.current !== requestId) {
        return;
      }

      setFeed({
        entries: payload.entries,
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
          error instanceof Error
            ? error.message
            : "Gagal memuat katalog provider.",
      });
    }
  }

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
      const response = await fetch(buildFeedUrl(feed.nextOffset, activeProviderId));
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

  const showGlobalEmptyState =
    feed.entries.length === 0 &&
    !feed.isLoading &&
    !feed.error &&
    !activeProviderId;
  const showProviderEmptyState =
    feed.entries.length === 0 &&
    !feed.isLoading &&
    !feed.error &&
    Boolean(activeProviderId);

  if (showGlobalEmptyState) {
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
      <div className="-mx-3 mb-4 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2">
          <ProviderTabButton
            isActive={!activeProviderId}
            label="Semua"
            logoUrl="/site-logo.jpg"
            onClick={() => {
              void loadFeedForProvider(null);
            }}
          />

          {providerTabs.map((provider) => (
            <ProviderTabButton
              key={provider.id}
              isActive={activeProviderId === provider.id}
              label={provider.name}
              logoUrl={provider.logoUrl}
              onClick={() => {
                void loadFeedForProvider(provider.id);
              }}
            />
          ))}
        </div>
      </div>

      {feed.isLoading && feed.entries.length === 0 ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-sm text-[var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Memuat katalog{activeProvider ? ` ${activeProvider.name}` : ""}...
          </span>
        </div>
      ) : showProviderEmptyState ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-sm text-[var(--muted)]">
          Belum ada drama dari provider ini.
        </div>
      ) : (
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
      )}

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

function ProviderTabButton({
  isActive,
  label,
  logoUrl,
  onClick,
}: {
  isActive: boolean;
  label: string;
  logoUrl?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isActive
          ? "inline-flex h-12 items-center gap-2 rounded-full border border-accent/50 bg-accent px-3.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,122,69,0.28)]"
          : "inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 text-sm font-semibold text-white/82 transition hover:border-accent/35 hover:bg-white/[0.075]"
      }
    >
      {logoUrl ? (
        <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image
            src={logoUrl}
            alt=""
            width={32}
            height={32}
            className="max-h-full max-w-full object-contain"
          />
        </span>
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-black/25 text-xs uppercase text-white">
          {label.slice(0, 2)}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}
