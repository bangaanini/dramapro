"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookOpen, Home, Megaphone, Search, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, key: "home" },
  { href: "/library", label: "Perpustakaan", icon: BookOpen, key: "library", prominent: false },
  { href: "/search", label: "Cari", icon: Search, key: "search", prominent: false },
  { href: "/affiliate", label: "Affiliate", icon: Megaphone, key: "affiliate", prominent: false },
  { href: "/profile", label: "Profil", icon: UserRound, key: "profile", prominent: false },
] as const;

function subscribeToDocumentBody() {
  return () => {};
}

function getDocumentBodySnapshot() {
  return document.body;
}

function getServerDocumentBodySnapshot() {
  return null;
}

function resolveCurrentKey(pathname: string) {
  if (pathname === "/") {
    return "home";
  }

  if (pathname.startsWith("/search")) {
    return "search";
  }

  if (
    pathname.startsWith("/library") ||
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/history")
  ) {
    return "library";
  }

  if (pathname.startsWith("/affiliate")) {
    return "affiliate";
  }

  if (pathname.startsWith("/profile")) {
    return "profile";
  }

  return null;
}

export function SiteFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const currentKey = resolveCurrentKey(pathname);
  const touchHapticLockRef = useRef(false);
  const portalTarget = useSyncExternalStore(
    subscribeToDocumentBody,
    getDocumentBodySnapshot,
    getServerDocumentBodySnapshot,
  );

  useEffect(() => {
    for (const item of NAV_ITEMS) {
      if (item.href !== pathname) {
        router.prefetch(item.href);
      }
    }
  }, [pathname, router]);

  function prefetchRoute(href: string) {
    router.prefetch(href);
  }

  function handleNavigationPress() {
    touchHapticLockRef.current = true;
    triggerSelectionHaptic();
    window.setTimeout(() => {
      touchHapticLockRef.current = false;
    }, 420);
  }

  const navMarkup = (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80]">
      <nav className="floating-nav-shell pointer-events-auto mx-auto flex w-full max-w-none items-end justify-between rounded-none border-x-0 border-b-0 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentKey === item.key;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => prefetchRoute(item.href)}
              onTouchStart={() => {
                prefetchRoute(item.href);
                handleNavigationPress();
              }}
              onFocus={() => prefetchRoute(item.href)}
              onClick={() => {
                if (touchHapticLockRef.current) {
                  return;
                }

                triggerSelectionHaptic();
              }}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 pt-1 text-center transition",
              )}
            >
              <span
                className={cn(
                  "relative inline-flex size-11 items-center justify-center rounded-full border transition",
                  isActive
                    ? "border-white/12 bg-white/12 text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
                    : "border-transparent bg-transparent text-white/60",
                )}
              >
                <Icon className="size-6" />
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium tracking-tight",
                  isActive ? "text-white" : "text-white/58",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <div className="h-24 sm:h-26" />
      {portalTarget ? createPortal(navMarkup, portalTarget) : null}
    </>
  );
}
