"use client";

import {
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LoaderCircle } from "lucide-react";

import { DramaCard } from "@/components/drama-card";
import { Card, CardContent } from "@/components/ui/card";
import { safeSessionStorage } from "@/lib/safe-session-storage";
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
const HOME_FEED_CACHE_KEY = "dramapro.home-feed-tabs.v3";
const HOME_FEED_SCROLL_CACHE_KEY = "dramapro.home-feed-tabs.scroll.v1";
const HOME_FEED_CACHE_TTL_MS = 1000 * 60 * 10;

type CachedHomeFeedTabsState = {
  activeTab: FeedTabKey;
  feeds: Record<FeedTabKey, FeedState>;
  savedAt: number;
};

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
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeDragging, setIsSwipeDragging] = useState(false);
  const [tabMetrics, setTabMetrics] = useState<
    Partial<Record<FeedTabKey, { width: number; left: number }>>
  >({});
  const [feeds, setFeeds] = useState<Record<FeedTabKey, FeedState>>({
    home: createInitialFeedState(homeEntries, homeTotal),
    new: createInitialFeedState(newEntries, newTotal),
    popular: createInitialFeedState(popularEntries, popularTotal),
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Partial<Record<FeedTabKey, HTMLButtonElement | null>>>({});
  const sentinelRefs = useRef<Partial<Record<FeedTabKey, HTMLDivElement | null>>>({});
  const feedsRef = useRef(feeds);
  const scrollPositionsRef = useRef<Record<FeedTabKey, number>>({
    home: 0,
    new: 0,
    popular: 0,
  });
  const inFlightRef = useRef<Record<FeedTabKey, boolean>>({
    home: false,
    new: false,
    popular: false,
  });
  const swipeGestureRef = useRef<{
    startX: number;
    startY: number;
    deltaX: number;
    deltaY: number;
    isHorizontal: boolean;
  } | null>(null);

  useEffect(() => {
    feedsRef.current = feeds;
  }, [feeds]);

  useEffect(() => {
    const cachedState =
      safeSessionStorage.getJSON<CachedHomeFeedTabsState>(HOME_FEED_CACHE_KEY);

    if (!cachedState) {
      return;
    }

    if (Date.now() - cachedState.savedAt > HOME_FEED_CACHE_TTL_MS) {
      safeSessionStorage.removeItem(HOME_FEED_CACHE_KEY);
      return;
    }

    setActiveTab(cachedState.activeTab);
    setFeeds({
      home: { ...cachedState.feeds.home, isLoading: false },
      new: { ...cachedState.feeds.new, isLoading: false },
      popular: { ...cachedState.feeds.popular, isLoading: false },
    });
  }, []);

  useEffect(() => {
    const cachedScrollPositions =
      safeSessionStorage.getJSON<Record<FeedTabKey, number>>(
        HOME_FEED_SCROLL_CACHE_KEY,
      );

    if (!cachedScrollPositions) {
      return;
    }

    scrollPositionsRef.current = {
      home: cachedScrollPositions.home ?? 0,
      new: cachedScrollPositions.new ?? 0,
      popular: cachedScrollPositions.popular ?? 0,
    };
  }, []);

  useEffect(() => {
    safeSessionStorage.setJSON(HOME_FEED_CACHE_KEY, {
      activeTab,
      feeds: {
        home: { ...feeds.home, isLoading: false },
        new: { ...feeds.new, isLoading: false },
        popular: { ...feeds.popular, isLoading: false },
      },
      savedAt: Date.now(),
    } satisfies CachedHomeFeedTabsState);
  }, [activeTab, feeds]);

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
  const activeTabIndex = tabs.findIndex((tab) => tab.key === activeTab);

  const setActiveTabWithBounds = useCallback(
    (index: number) => {
      const boundedIndex = Math.min(Math.max(index, 0), tabs.length - 1);
      if (typeof window !== "undefined") {
        scrollPositionsRef.current[activeTab] = window.scrollY;
        safeSessionStorage.setJSON(
          HOME_FEED_SCROLL_CACHE_KEY,
          scrollPositionsRef.current,
        );
      }
      setActiveTab(tabs[boundedIndex]?.key ?? tabs[0].key);
    },
    [activeTab, tabs],
  );

  const loadMore = useCallback(async (tabKey: FeedTabKey) => {
    const currentFeedState = feedsRef.current[tabKey];
    const requestOffset = currentFeedState.entries.length;

    if (
      currentFeedState.isLoading ||
      !currentFeedState.hasMore
    ) {
      return;
    }

    if (inFlightRef.current[tabKey]) {
      return;
    }

    inFlightRef.current[tabKey] = true;

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
        `/api/catalog/feed?source=${encodeURIComponent(tabKey)}&offset=${requestOffset}&limit=${FEED_PAGE_SIZE}`,
        {
          credentials: "same-origin",
          cache: "no-store",
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
            nextOffset: mergedEntries.length,
            hasMore: mergedEntries.length < nextPage.total,
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
    } finally {
      inFlightRef.current[tabKey] = false;
    }
  }, []);

  useEffect(() => {
    const tabList = tabListRef.current;

    if (!tabList) {
      return;
    }

    const measure = () => {
      const tabListRect = tabList.getBoundingClientRect();
      const nextMetrics: Partial<Record<FeedTabKey, { width: number; left: number }>> =
        {};

      for (const tab of tabs) {
        const button = tabButtonRefs.current[tab.key];

        if (!button) {
          continue;
        }

        const rect = button.getBoundingClientRect();
        nextMetrics[tab.key] = {
          width: rect.width,
          left: rect.left - tabListRect.left + tabList.scrollLeft,
        };
      }

      setTabMetrics(nextMetrics);
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(tabList);

    return () => {
      resizeObserver.disconnect();
    };
  }, [tabs]);

  useEffect(() => {
    const activeButton = tabButtonRefs.current[activeTab];

    if (!activeButton) {
      return;
    }

    activeButton.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: isSwipeDragging ? "auto" : "smooth",
    });
  }, [activeTab, isSwipeDragging]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollPositionsRef.current[activeTab] ?? 0,
        behavior: "auto",
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeTab]);

  useEffect(() => {
    let ticking = false;

    const persistScroll = () => {
      safeSessionStorage.setJSON(
        HOME_FEED_SCROLL_CACHE_KEY,
        scrollPositionsRef.current,
      );
    };

    const handleScroll = () => {
      scrollPositionsRef.current[activeTab] = window.scrollY;

      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        persistScroll();
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeTab]);

  useEffect(() => {
    const neighborTabs = [tabs[activeTabIndex - 1], tabs[activeTabIndex + 1]].filter(
      Boolean,
    ) as FeedTabConfig[];

    if (neighborTabs.length === 0) {
      return;
    }

    let cancelled = false;
    const useIdleCallback = "requestIdleCallback" in window;
    const idleHandle = useIdleCallback
      ? window.requestIdleCallback(() => {
            if (cancelled) {
              return;
            }

            for (const tab of neighborTabs) {
              const feed = feedsRef.current[tab.key];

              if (
                feed.entries.length > FEED_PAGE_SIZE ||
                !feed.hasMore ||
                feed.isLoading ||
                inFlightRef.current[tab.key]
              ) {
                continue;
              }

              void loadMore(tab.key);
            }
          }, { timeout: 1200 })
      : window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          for (const tab of neighborTabs) {
            const feed = feedsRef.current[tab.key];

            if (
              feed.entries.length > FEED_PAGE_SIZE ||
              !feed.hasMore ||
              feed.isLoading ||
              inFlightRef.current[tab.key]
            ) {
              continue;
            }

            void loadMore(tab.key);
          }
        }, 420);

    return () => {
      cancelled = true;

      if (useIdleCallback && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
        return;
      }

      if (typeof idleHandle === "number") {
        window.clearTimeout(idleHandle);
      }
    };
  }, [activeTabIndex, loadMore, tabs]);

  useEffect(() => {
    const sentinel = sentinelRefs.current[currentTab.key];

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
        rootMargin: "220px 0px 320px 0px",
        threshold: 0.15,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [currentFeed.hasMore, currentFeed.isLoading, currentTab.key, loadMore]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    swipeGestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      isHorizontal: false,
    };
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const gesture = swipeGestureRef.current;
    const touch = event.touches[0];

    if (!gesture || !touch) {
      return;
    }

    gesture.deltaX = touch.clientX - gesture.startX;
    gesture.deltaY = touch.clientY - gesture.startY;

    if (!gesture.isHorizontal) {
      if (Math.abs(gesture.deltaX) < 14) {
        return;
      }

      if (Math.abs(gesture.deltaX) <= Math.abs(gesture.deltaY)) {
        swipeGestureRef.current = null;
        setSwipeOffset(0);
        setIsSwipeDragging(false);
        return;
      }

      gesture.isHorizontal = true;
      setIsSwipeDragging(true);
    }

    const maxOffset = viewportRef.current
      ? viewportRef.current.clientWidth * 0.32
      : 120;
    const isEdgeSwipe =
      (activeTabIndex === 0 && gesture.deltaX > 0) ||
      (activeTabIndex === tabs.length - 1 && gesture.deltaX < 0);
    const nextOffset = Math.max(
      -maxOffset,
      Math.min(maxOffset, isEdgeSwipe ? gesture.deltaX * 0.35 : gesture.deltaX * 0.9),
    );

    setSwipeOffset(nextOffset);
  }, [activeTabIndex, tabs.length]);

  const handleTouchEnd = useCallback(() => {
    const gesture = swipeGestureRef.current;
    swipeGestureRef.current = null;

    if (!gesture?.isHorizontal) {
      setSwipeOffset(0);
      setIsSwipeDragging(false);
      return;
    }

    const viewportWidth = viewportRef.current?.clientWidth ?? 1;
    const threshold = Math.min(82, viewportWidth * 0.14);

    if (gesture.deltaX <= -threshold && activeTabIndex < tabs.length - 1) {
      setActiveTabWithBounds(activeTabIndex + 1);
    } else if (gesture.deltaX >= threshold && activeTabIndex > 0) {
      setActiveTabWithBounds(activeTabIndex - 1);
    }

    setSwipeOffset(0);
    setIsSwipeDragging(false);
  }, [activeTabIndex, setActiveTabWithBounds, tabs.length]);

  const viewportWidth = viewportRef.current?.clientWidth ?? 1;
  const swipeProgress = Math.max(-1, Math.min(1, swipeOffset / viewportWidth));
  const panelTransform = `translate3d(calc(${-activeTabIndex * 100}% + ${swipeOffset}px), 0, 0)`;
  const canSwipePrev = activeTabIndex > 0;
  const canSwipeNext = activeTabIndex < tabs.length - 1;
  const activeMetric = tabMetrics[activeTab];
  const neighborTab =
    swipeProgress < 0
      ? tabs[activeTabIndex + 1]
      : swipeProgress > 0
        ? tabs[activeTabIndex - 1]
        : null;
  const neighborMetric = neighborTab ? tabMetrics[neighborTab.key] : null;
  const interpolationProgress = Math.min(1, Math.abs(swipeProgress) * 1.2);
  const computedIndicator = activeMetric
    ? {
        width:
          neighborMetric && isSwipeDragging
            ? activeMetric.width +
              (neighborMetric.width - activeMetric.width) * interpolationProgress
            : activeMetric.width,
        left:
          neighborMetric && isSwipeDragging
            ? activeMetric.left +
              (neighborMetric.left - activeMetric.left) * interpolationProgress
            : activeMetric.left,
        opacity: 1,
      }
    : { width: 0, left: 0, opacity: 0 };

  return (
    <section className="mx-auto mt-0 w-full max-w-7xl space-y-4 px-3 pb-2 sm:px-4 lg:px-6">
      <div className="sticky top-[3.9rem] z-40 -mx-3 border-b border-white/7 bg-[linear-gradient(180deg,rgba(15,10,10,0.98),rgba(15,10,10,0.9)_72%,rgba(15,10,10,0.78))] px-3 pb-2 pt-2 backdrop-blur-2xl shadow-[0_10px_24px_rgba(0,0,0,0.18)] sm:top-[4.2rem] sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[rgba(15,10,10,0.42)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div
            ref={tabListRef}
            className="relative flex min-w-0 items-center gap-4 overflow-x-auto scrollbar-none"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                ref={(node) => {
                  tabButtonRefs.current[tab.key] = node;
                }}
                type="button"
                onClick={() => setActiveTabWithBounds(index)}
                className={cn(
                  "relative shrink-0 pb-2 text-sm font-semibold transition",
                  activeTab === tab.key
                    ? "text-white"
                    : "text-white/45 hover:text-white/80",
                )}
              >
                {tab.label}
              </button>
            ))}
            <span
              className="pointer-events-none absolute -bottom-0.5 h-0.5 rounded-full bg-[linear-gradient(90deg,rgba(255,180,87,0.95),rgba(255,122,69,1))] shadow-[0_0_18px_rgba(255,160,70,0.5)] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: `${computedIndicator.width}px`,
                left: `${computedIndicator.left}px`,
                opacity: computedIndicator.opacity,
              }}
            />
          </div>
          <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
            {currentFeed.total} judul
          </span>
        </div>

        <div className="relative mt-2 flex items-center justify-center gap-1.5">
          {tabs.map((tab) => (
            <span
              key={tab.key}
              className={cn(
                "block h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                activeTab === tab.key
                  ? "w-6 bg-[linear-gradient(90deg,#ffb457,#ff7a45)] shadow-[0_0_12px_rgba(255,145,73,0.35)]"
                  : "w-1.5 bg-white/18",
              )}
            />
          ))}
          <span className="sr-only">
            {canSwipePrev || canSwipeNext
              ? "Swipe kanan kiri untuk berpindah tab"
              : "Tab aktif"}
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
          <div
            ref={viewportRef}
            className="overflow-hidden rounded-[1.35rem]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{ touchAction: "pan-y" }}
          >
            <div
              className={cn(
                "flex will-change-transform",
                isSwipeDragging
                  ? "transition-none"
                  : "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              )}
              style={{ transform: panelTransform }}
            >
              {tabs.map((tab) => {
                const feed = feeds[tab.key];
                const tabIndex = tabs.findIndex((item) => item.key === tab.key);
                const distance = tabIndex - activeTabIndex;
                const depthShift =
                  isSwipeDragging || swipeOffset !== 0
                    ? -swipeOffset * (distance === 0 ? 0.12 : 0.06)
                    : 0;
                const panelScale =
                  distance === 0 ? 1 : 0.992 - Math.min(Math.abs(distance), 2) * 0.002;
                const panelOpacity = distance === 0 ? 1 : 0.92;

                return (
                  <div key={tab.key} className="min-w-full">
                    <div
                      className={cn(
                        "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isSwipeDragging && "transition-none",
                      )}
                      style={{
                        transform: `translate3d(${depthShift}px,0,0) scale(${panelScale})`,
                        opacity: panelOpacity,
                      }}
                    >
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                      {feed.entries.map((entry) => (
                        <DramaCard
                          key={`${tab.key}-${entry.id}`}
                          href={entry.href}
                          title={entry.title}
                          thumbUrl={entry.thumbUrl}
                          providerName={entry.providerName}
                          episodeCount={entry.episodeCount}
                          compact
                          hideCta
                          cornerLabel={tab.badgeLabel}
                        />
                      ))}
                      </div>
                    </div>

                    <div
                      ref={(node) => {
                        sentinelRefs.current[tab.key] = node;
                      }}
                      className="h-1 w-full"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          </div>

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
