"use client";

import { useState } from "react";

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
  entries: HomeFeedEntry[];
  total: number;
  emptyCopy: string;
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

export function HomeFeedTabs({
  homeEntries,
  homeTotal,
  newEntries,
  newTotal,
  popularEntries,
  popularTotal,
}: HomeFeedTabsProps) {
  const [activeTab, setActiveTab] = useState<FeedTabKey>("new");
  const [visibleCounts, setVisibleCounts] = useState<Record<FeedTabKey, number>>({
    home: FEED_PAGE_SIZE,
    new: FEED_PAGE_SIZE,
    popular: FEED_PAGE_SIZE,
  });

  const tabs: FeedTabConfig[] = [
    {
      key: "new",
      label: "Terbaru",
      badgeLabel: "NEW",
      entries: newEntries,
      total: newTotal,
      emptyCopy: "Belum ada drama terbaru. Jalankan sync feed new dari panel admin.",
    },
    {
      key: "popular",
      label: "Populer",
      badgeLabel: "HOT",
      entries: popularEntries,
      total: popularTotal,
      emptyCopy:
        "Belum ada drama populer. Jalankan sync feed populer dari panel admin.",
    },
    {
      key: "home",
      label: "Untukmu",
      badgeLabel: null,
      entries: homeEntries,
      total: homeTotal,
      emptyCopy:
        "Belum ada rekomendasi. Jalankan sync feed home dari panel admin.",
    },
  ];

  const currentTab =
    tabs.find((tab) => tab.key === activeTab) ??
    tabs[0];
  const visibleEntries = currentTab.entries.slice(0, visibleCounts[currentTab.key]);
  const hasMore = visibleCounts[currentTab.key] < currentTab.entries.length;

  return (
    <section className="mx-auto mt-0 w-full max-w-7xl space-y-4 px-3 pb-2 sm:px-4 lg:px-6">
      <div className="sticky top-[3.9rem] z-40 -mx-3 border-b border-white/8 bg-[rgba(12,8,8,0.94)] px-3 pb-2 pt-2 backdrop-blur-xl sm:top-[4.2rem] sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
        <div className="flex items-center justify-between gap-3">
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
                    "absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-white transition",
                    activeTab === tab.key ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
            {currentTab.total} judul
          </span>
        </div>
      </div>

      {currentTab.entries.length === 0 ? (
        <Card className="glass-panel rounded-[1.4rem] border-white/10">
          <CardContent className="flex min-h-36 items-center justify-center px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            {currentTab.emptyCopy}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {visibleEntries.map((entry) => (
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

          {hasMore ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    [currentTab.key]: Math.min(
                      current[currentTab.key] + FEED_PAGE_SIZE,
                      currentTab.entries.length,
                    ),
                  }))
                }
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
