"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BookOpen,
  Download,
  Home,
  Megaphone,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { triggerSelectionHaptic } from "@/lib/haptics";
import "@/lib/telegram-web-app";
import { supportsTelegramHomeScreen } from "@/lib/telegram-web-app";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, key: "home" },
  { href: "/library", label: "Perpustakaan", icon: BookOpen, key: "library", prominent: false },
  { href: "/search", label: "Cari", icon: Search, key: "search", prominent: false },
  { href: "/affiliate", label: "Affiliate", icon: Megaphone, key: "affiliate", prominent: false },
  { href: "/profile", label: "Profil", icon: UserRound, key: "profile", prominent: false },
] as const;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const PWA_BANNER_DISMISSED_KEY = "dramapro.pwa.banner.dismissedAt";
const PWA_BANNER_DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneNavigator = navigator as Navigator & {
    standalone?: boolean;
  };
  const isStandaloneMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const isNavigatorStandalone =
    typeof standaloneNavigator.standalone === "boolean" &&
    standaloneNavigator.standalone;

  return isStandaloneMedia || isNavigatorStandalone;
}

function isPwaBannerDismissed() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(PWA_BANNER_DISMISSED_KEY));

    return (
      Number.isFinite(dismissedAt) &&
      dismissedAt > 0 &&
      Date.now() - dismissedAt < PWA_BANNER_DISMISSED_TTL_MS
    );
  } catch {
    return false;
  }
}

function rememberPwaBannerDismissed() {
  try {
    window.localStorage.setItem(PWA_BANNER_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures in restrictive browser modes.
  }
}

function canRegisterServiceWorker() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    "serviceWorker" in navigator &&
    (window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const currentKey = resolveCurrentKey(pathname);
  const touchHapticLockRef = useRef(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
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

  useEffect(() => {
    if (canRegisterServiceWorker()) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (isStandaloneDisplayMode() || isPwaBannerDismissed()) {
      return;
    }

    const telegramWebApp = window.Telegram?.WebApp;

    if (
      telegramWebApp &&
      supportsTelegramHomeScreen(telegramWebApp) &&
      typeof telegramWebApp.addToHomeScreen === "function"
    ) {
      try {
        telegramWebApp.checkHomeScreenStatus?.((status) => {
          if (status === "added") {
            return;
          }

          setShowInstallBanner(true);
        });
      } catch {
        setShowInstallBanner(true);
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setShowInstallBanner(false);
      rememberPwaBannerDismissed();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

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

  async function handleInstallPress() {
    if (isInstalling) {
      return;
    }

    triggerSelectionHaptic();
    setIsInstalling(true);

    try {
      const telegramWebApp = window.Telegram?.WebApp;

      if (
        telegramWebApp &&
        supportsTelegramHomeScreen(telegramWebApp) &&
        typeof telegramWebApp.addToHomeScreen === "function"
      ) {
        try {
          telegramWebApp.addToHomeScreen();
          rememberPwaBannerDismissed();
          setShowInstallBanner(false);
          return;
        } catch {
          // Fall back to the browser install prompt below when available.
        }
      }

      if (!installPromptEvent) {
        return;
      }

      await installPromptEvent.prompt();
      await installPromptEvent.userChoice?.catch(() => null);
      setInstallPromptEvent(null);
      rememberPwaBannerDismissed();
      setShowInstallBanner(false);
    } finally {
      setIsInstalling(false);
    }
  }

  function handleDismissInstallBanner() {
    triggerSelectionHaptic();
    rememberPwaBannerDismissed();
    setShowInstallBanner(false);
  }

  const installBannerMarkup = showInstallBanner ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] z-[90] flex justify-center px-3 sm:bottom-[calc(6.2rem+env(safe-area-inset-bottom))] sm:px-5">
      <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-[1.35rem] border border-white/20 bg-[linear-gradient(135deg,rgba(84,57,49,0.95),rgba(36,25,22,0.97)_52%,rgba(102,45,25,0.93))] px-4 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold text-white sm:text-xl">
            Download Layar Drama
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-relaxed text-white/70 sm:text-sm">
            Tonton drama favorit lebih nyaman dari layar utama.
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstallPress}
          disabled={isInstalling}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff8a3d,#ff4f2d)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_16px_36px_rgba(255,99,45,0.32)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-base"
        >
          <Download className="size-5" />
          <span>Install</span>
        </button>
        <button
          type="button"
          aria-label="Tutup banner install"
          title="Tutup"
          onClick={handleDismissInstallBanner}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/82 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-6" />
        </button>
      </div>
    </div>
  ) : null;

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
      {portalTarget
        ? createPortal(
            <>
              {installBannerMarkup}
              {navMarkup}
            </>,
            portalTarget,
          )
        : null}
    </>
  );
}
