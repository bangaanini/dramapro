"use client";

import { type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { Heart, History } from "lucide-react";

import { FavoritesGrid } from "@/components/favorites-grid";
import { HistoryList } from "@/components/history-list";
import { triggerImpactHaptic, triggerSelectionHaptic } from "@/lib/haptics";
import { safeSessionStorage } from "@/lib/safe-session-storage";
import { cn } from "@/lib/utils";

type LibraryTabKey = "favorites" | "history";

type LibraryTabsProps = {
  userId: string;
  initialTab?: LibraryTabKey;
  honorInitialTab?: boolean;
};

const LIBRARY_TAB_CACHE_KEY = "dramapro.library.active-tab.v1";

const TAB_CONFIG = [
  {
    key: "favorites" as const,
    label: "Favorit",
    badgeLabel: "Tersimpan",
    icon: Heart,
  },
  {
    key: "history" as const,
    label: "Riwayat",
    badgeLabel: "Terakhir diputar",
    icon: History,
  },
] as const;

export function LibraryTabs({
  userId,
  initialTab = "favorites",
  honorInitialTab = false,
}: LibraryTabsProps) {
  const initialResolvedTab = (() => {
    if (honorInitialTab) {
      return initialTab;
    }

    const cachedTab = safeSessionStorage.getItem(LIBRARY_TAB_CACHE_KEY);

    if (cachedTab === "favorites" || cachedTab === "history") {
      return cachedTab;
    }

    return initialTab;
  })();

  const [activeTab, setActiveTab] = useState<LibraryTabKey>(initialResolvedTab);
  const [mountedTabs, setMountedTabs] = useState<Record<LibraryTabKey, boolean>>({
    favorites: initialResolvedTab === "favorites",
    history: initialResolvedTab === "history",
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

    const viewportWidth = viewportRef.current?.clientWidth ?? 1;
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
        key: "favorites" as const,
        render: mountedTabs.favorites ? <FavoritesGrid userId={userId} /> : null,
      },
      {
        key: "history" as const,
        render: mountedTabs.history ? <HistoryList userId={userId} /> : null,
      },
    ],
    [mountedTabs, userId],
  );

  return (
    <section className="mx-auto mt-0 w-full max-w-7xl px-0 pb-2">
      <div className="sticky top-[3.9rem] z-40 border-b border-white/7 bg-[linear-gradient(180deg,rgba(15,10,10,0.98),rgba(15,10,10,0.9)_72%,rgba(15,10,10,0.78))] px-3 pb-2 pt-3 backdrop-blur-2xl shadow-[0_10px_24px_rgba(0,0,0,0.18)] sm:top-[4.2rem] sm:px-4">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[rgba(15,10,10,0.42)]" />
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

        <div className="relative space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Perpustakaan
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                Simpanan dan progresmu
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-5 overflow-x-auto px-1 scrollbar-none">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onPointerDown={() => triggerSelectionHaptic()}
                  onClick={() => switchToTab(tab.key)}
                  className={cn(
                    "relative shrink-0 pb-2 text-left transition",
                    isActive ? "text-white" : "text-white/48 hover:text-white/75",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="size-4" />
                    {tab.label}
                  </span>
                  <span className="mt-1 block text-[11px] text-white/45">
                    {tab.badgeLabel}
                  </span>
                  <span
                    className={cn(
                      "absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[linear-gradient(90deg,#ffb457,#ff7a45)] shadow-[0_0_18px_rgba(255,160,70,0.5)] transition",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {TAB_CONFIG.map((tab) => (
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
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="overflow-hidden px-3 pt-4 sm:px-4"
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
          {panels.map((panel, index) => {
            const distance = index - activeTabIndex;
            const depthShift =
              isSwipeDragging || swipeOffset !== 0
                ? -swipeOffset * (distance === 0 ? 0.12 : 0.06)
                : 0;
            const panelScale =
              distance === 0 ? 1 : 0.992 - Math.min(Math.abs(distance), 2) * 0.002;
            const panelOpacity = distance === 0 ? 1 : 0.92 - Math.abs(swipeProgress) * 0.04;

            return (
              <div key={panel.key} className="min-w-full">
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
                  {panel.render}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
