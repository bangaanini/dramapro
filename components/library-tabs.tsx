"use client";

import { type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Heart, History } from "lucide-react";

import { FavoritesGrid } from "@/components/favorites-grid";
import { HistoryList } from "@/components/history-list";
import { SavedEpisodesGrid } from "@/components/saved-episodes-grid";
import { triggerImpactHaptic, triggerSelectionHaptic } from "@/lib/haptics";
import { safeSessionStorage } from "@/lib/safe-session-storage";
import { cn } from "@/lib/utils";

type LibraryTabKey = "collection" | "history" | "saved";

type LibraryTabsProps = {
  userId: string;
  initialTab?: LibraryTabKey;
  honorInitialTab?: boolean;
};

const LIBRARY_TAB_CACHE_KEY = "dramapro.library.active-tab.v2";

const TAB_CONFIG = [
  {
    key: "collection" as const,
    label: "Koleksiku",
    icon: Heart,
  },
  {
    key: "history" as const,
    label: "Riwayat",
    icon: History,
  },
  {
    key: "saved" as const,
    label: "Tersimpan",
    icon: Bookmark,
  },
] as const;

export function LibraryTabs({
  userId,
  initialTab = "collection",
  honorInitialTab = false,
}: LibraryTabsProps) {
  const initialResolvedTab = (() => {
    if (honorInitialTab) {
      return initialTab;
    }

    const cachedTab = safeSessionStorage.getItem(LIBRARY_TAB_CACHE_KEY);

    if (cachedTab === "collection" || cachedTab === "history" || cachedTab === "saved") {
      return cachedTab;
    }

    return initialTab;
  })();

  const [activeTab, setActiveTab] = useState<LibraryTabKey>(initialResolvedTab);
  const [mountedTabs, setMountedTabs] = useState<Record<LibraryTabKey, boolean>>({
    collection: initialResolvedTab === "collection",
    history: initialResolvedTab === "history",
    saved: initialResolvedTab === "saved",
  });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeDragging, setIsSwipeDragging] = useState(false);
  const [edgePulse, setEdgePulse] = useState<"left" | "right" | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const swipeGestureRef = useRef<{
    startX: number;
    startY: number;
    deltaX: number;
    deltaY: number;
    isHorizontal: boolean;
  } | null>(null);

  useEffect(() => {
    safeSessionStorage.setItem(LIBRARY_TAB_CACHE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!edgePulse) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setEdgePulse(null);
    }, 240);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [edgePulse]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateViewportWidth = () => {
      setViewportWidth(viewport.clientWidth || 1);
    };

    updateViewportWidth();

    const resizeObserver = new ResizeObserver(updateViewportWidth);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const activeTabIndex = TAB_CONFIG.findIndex((tab) => tab.key === activeTab);

  function switchToTab(nextTab: LibraryTabKey) {
    if (nextTab === activeTab) {
      return;
    }

    triggerSelectionHaptic();
    setMountedTabs((current) => ({
      ...current,
      [nextTab]: true,
    }));
    setActiveTab(nextTab);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
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
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
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
      ? viewportRef.current.clientWidth * 0.3
      : 120;
    const isEdgeSwipe =
      (activeTabIndex === 0 && gesture.deltaX > 0) ||
      (activeTabIndex === TAB_CONFIG.length - 1 && gesture.deltaX < 0);
    const nextOffset = Math.max(
      -maxOffset,
      Math.min(maxOffset, isEdgeSwipe ? gesture.deltaX * 0.35 : gesture.deltaX * 0.9),
    );

    setSwipeOffset(nextOffset);
  }

  function handleTouchEnd() {
    const gesture = swipeGestureRef.current;
    swipeGestureRef.current = null;

    if (!gesture?.isHorizontal) {
      setSwipeOffset(0);
      setIsSwipeDragging(false);
      return;
    }

    const threshold = Math.min(82, viewportWidth * 0.14);

    if (gesture.deltaX <= -threshold && activeTabIndex < TAB_CONFIG.length - 1) {
      switchToTab(TAB_CONFIG[activeTabIndex + 1].key);
    } else if (gesture.deltaX >= threshold && activeTabIndex > 0) {
      switchToTab(TAB_CONFIG[activeTabIndex - 1].key);
    } else if (gesture.deltaX <= -threshold && activeTabIndex >= TAB_CONFIG.length - 1) {
      setEdgePulse("right");
      triggerImpactHaptic("light");
    } else if (gesture.deltaX >= threshold && activeTabIndex <= 0) {
      setEdgePulse("left");
      triggerImpactHaptic("light");
    }

    setSwipeOffset(0);
    setIsSwipeDragging(false);
  }

  const swipeProgress = Math.max(-1, Math.min(1, swipeOffset / viewportWidth));
  const panelTransform = `translate3d(calc(${-activeTabIndex * 100}% + ${swipeOffset}px), 0, 0)`;

  const panels = useMemo(
    () => [
      {
        key: "collection" as const,
        render: mountedTabs.collection ? <FavoritesGrid userId={userId} /> : null,
      },
      {
        key: "history" as const,
        render: mountedTabs.history ? <HistoryList userId={userId} /> : null,
      },
      {
        key: "saved" as const,
        render: mountedTabs.saved ? <SavedEpisodesGrid userId={userId} /> : null,
      },
    ],
    [mountedTabs, userId],
  );

  return (
    <section className="mx-auto mt-0 w-full max-w-none px-0 pb-2">
      <div className="sticky top-[3.95rem] z-40 border-b border-white/7 bg-[linear-gradient(180deg,rgba(15,10,10,0.98),rgba(15,10,10,0.92)_74%,rgba(15,10,10,0.82))] px-3 pb-2 pt-2 backdrop-blur-2xl shadow-[0_10px_24px_rgba(0,0,0,0.18)] sm:top-[4.2rem]">
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-8 transition-opacity duration-200",
            edgePulse === "left"
              ? "bg-[radial-gradient(circle_at_left,rgba(255,142,61,0.32),transparent_72%)] opacity-100"
              : "opacity-0",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 transition-opacity duration-200",
            edgePulse === "right"
              ? "bg-[radial-gradient(circle_at_right,rgba(255,142,61,0.32),transparent_72%)] opacity-100"
              : "opacity-0",
          )}
        />

        <div className="relative flex items-center justify-between gap-3 px-1 pb-1">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Perpustakaan
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
              Koleksi dramamu
            </h1>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Swipe untuk pindah tab
          </p>
        </div>

        <div className="relative mt-2 grid grid-cols-3 gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1">
          <div
            className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-[linear-gradient(135deg,rgba(255,140,64,0.92),rgba(255,95,31,0.88))] shadow-[0_16px_30px_rgba(255,122,69,0.24)] transition-transform duration-300 ease-out"
            style={{
              width: "calc((100% - 0.5rem) / 3)",
              transform: `translateX(calc(${activeTabIndex * 100}% + ${swipeProgress * 16}px))`,
            }}
          />
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchToTab(tab.key)}
                className={cn(
                  "relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "text-white" : "text-white/66",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={viewportRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className={cn(
            "flex will-change-transform",
            isSwipeDragging
              ? "transition-none"
              : "transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]",
          )}
          style={{ transform: panelTransform }}
        >
          {panels.map((panel) => (
            <div key={panel.key} className="min-w-full px-2 pb-24 pt-3 sm:px-4">
              {panel.render}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
