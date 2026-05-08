"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookOpen, Home, Megaphone, Search, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, key: "home" },
  { href: "/library", label: "Perpustakaan", icon: BookOpen, key: "library" },
  { href: "/search", label: "Cari", icon: Search, key: "search" },
  { href: "/affiliate", label: "Affiliate", icon: Megaphone, key: "affiliate" },
  { href: "/profile", label: "Profil", icon: UserRound, key: "profile" },
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

export function SiteFooter({ siteName = "Layar Drama" }: { siteName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentKey = resolveCurrentKey(pathname);
  const [initialPathname] = useState(pathname);
  const touchHapticLockRef = useRef(false);
  const portalTarget = useSyncExternalStore(
    subscribeToDocumentBody,
    getDocumentBodySnapshot,
    getServerDocumentBodySnapshot,
  );
  const shouldAutoShowInstallBanner =
    pathname === "/" && initialPathname === "/";

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
    <div
      aria-hidden="true"
      className="hidden pointer-events-none fixed inset-x-0 bottom-0 z-[80] lg:hidden"
    >
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
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 pt-1 text-center transition"
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
      <PwaInstallBanner
        autoShow={shouldAutoShowInstallBanner}
        siteName={siteName}
      />
      {portalTarget ? createPortal(navMarkup, portalTarget) : null}
    </>
  );
}
