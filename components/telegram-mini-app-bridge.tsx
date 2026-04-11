"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { safeSessionStorage } from "@/lib/safe-session-storage";

type TelegramBackButton = {
  show?: () => void;
  hide?: () => void;
  onClick?: (callback: () => void) => void;
  offClick?: (callback: () => void) => void;
};

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton?: TelegramBackButton;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const TELEGRAM_SESSION_CACHE_KEY = "dramapro.telegram.session.v1";

const TARGET_ROUTES = {
  home: "/",
  search: "/search",
  vip: "/vip",
  profile: "/profile",
  affiliate: "/affiliate",
} as const;

type TelegramTarget = keyof typeof TARGET_ROUTES;

function isTelegramTarget(value: string | null): value is TelegramTarget {
  return Boolean(value && value in TARGET_ROUTES);
}

export function TelegramMiniAppBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const target = searchParams.get("tg_target");

  useLayoutEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      return;
    }

    webApp.ready?.();
    webApp.expand?.();
    webApp.setHeaderColor?.("#120c0b");
    webApp.setBackgroundColor?.("#120c0b");

    const initData = webApp.initData?.trim();

    if (!initData) {
      return;
    }

    const cached =
      safeSessionStorage.getJSON<{ initData: string }>(TELEGRAM_SESSION_CACHE_KEY);

    const redirectToTarget = () => {
      if (pathname !== "/" || !isTelegramTarget(target)) {
        return;
      }

      window.history.replaceState(window.history.state, "", "/");

      if (target === "home") {
        router.replace("/");
        return;
      }

      router.push(TARGET_ROUTES[target], { scroll: false });
    };

    if (cached?.initData === initData) {
      redirectToTarget();
      return;
    }

    let cancelled = false;

    async function syncTelegramSession() {
      try {
        const response = await fetch("/api/auth/telegram/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ initData }),
        });

        if (!response.ok) {
          return;
        }

        if (cancelled) {
          return;
        }

        safeSessionStorage.setJSON(TELEGRAM_SESSION_CACHE_KEY, { initData });
        redirectToTarget();
      } catch {
        // Fail silently so the web shell stays usable outside Telegram.
      }
    }

    void syncTelegramSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, target]);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const backButton = webApp?.BackButton;

    if (!webApp || !backButton) {
      return;
    }

    const match = pathname.match(/^\/watch\/([^/]+)\/play$/);
    const watchDetailPath = match ? `/watch/${match[1]}` : null;
    const shouldShowBackButton = pathname !== "/";

    const handleBack = () => {
      if (watchDetailPath) {
        router.replace(watchDetailPath, { scroll: false });
        return;
      }

      if (window.history.length > 1) {
        router.back();
        return;
      }

      router.replace("/", { scroll: false });
    };

    if (shouldShowBackButton) {
      backButton.show?.();
      backButton.onClick?.(handleBack);
    } else {
      backButton.hide?.();
    }

    return () => {
      backButton.offClick?.(handleBack);
      backButton.hide?.();
    };
  }, [pathname, router]);

  return null;
}
