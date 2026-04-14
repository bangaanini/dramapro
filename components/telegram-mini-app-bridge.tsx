"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { safeSessionStorage } from "@/lib/safe-session-storage";
import "@/lib/telegram-web-app";
import { supportsTelegramBackButton } from "@/lib/telegram-web-app";

const TELEGRAM_SESSION_CACHE_KEY = "dramapro.telegram.session.v1";
const TELEGRAM_REF_CAPTURE_PREFIX = "dramapro.telegram.ref.";

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

function parseTelegramStartParam(value: string | null) {
  if (!value) {
    return {
      dramaId: null,
      referralCode: null,
      target: null,
    };
  }

  const trimmed = value.trim();
  const targetMatch = trimmed.match(
    /^(?:(?:tg_)?target_)?(home|search|vip|profile|affiliate)(?:__ref_([A-Z0-9]+))?$/i,
  );

  if (targetMatch) {
    return {
      dramaId: null,
      referralCode: targetMatch[2]?.toUpperCase() ?? null,
      target: targetMatch[1]?.toLowerCase() as TelegramTarget,
    };
  }

  const match = trimmed.match(/^drama_([a-z0-9-]+)(?:__ref_([A-Z0-9]+))?$/i);

  if (!match) {
    return {
      dramaId: null,
      referralCode: null,
      target: null,
    };
  }

  return {
    dramaId: match[1] ?? null,
    referralCode: match[2]?.toUpperCase() ?? null,
    target: null,
  };
}

export function TelegramMiniAppBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const targetFromQuery = searchParams.get("tg_target");
  const botUsername = searchParams.get("tg_bot")?.trim().replace(/^@/, "") ?? null;
  const startParam = searchParams.get("tgWebAppStartParam");
  const parsedStartParam = parseTelegramStartParam(startParam);
  const target = targetFromQuery ?? parsedStartParam.target;
  const referralCode =
    searchParams.get("tg_ref")?.trim().toUpperCase() ??
    parsedStartParam.referralCode;

  useLayoutEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      return;
    }

    const initData = webApp.initData?.trim();

    if (!initData) {
      return;
    }

    webApp.ready?.();
    webApp.expand?.();

    try {
      webApp.setHeaderColor?.("#120c0b");
      webApp.setBackgroundColor?.("#120c0b");
    } catch {
      // Ignore unsupported Telegram methods outside newer Mini App runtimes.
    }

    const cached =
      safeSessionStorage.getJSON<{ initData: string; botUsername: string | null }>(
        TELEGRAM_SESSION_CACHE_KEY,
      );

    const redirectToTarget = () => {
      if (pathname !== "/") {
        return;
      }

      window.history.replaceState(window.history.state, "", "/");

      if (parsedStartParam.dramaId) {
        router.push(`/watch/${parsedStartParam.dramaId}`, { scroll: false });
        return;
      }

      if (!isTelegramTarget(target)) {
        return;
      }

      if (target === "home") {
        router.replace("/");
        return;
      }

      router.push(TARGET_ROUTES[target], { scroll: false });
    };

    if (
      cached?.initData === initData &&
      cached.botUsername === botUsername &&
      !referralCode
    ) {
      redirectToTarget();
      return;
    }

    let cancelled = false;

    async function syncTelegramSession() {
      try {
        if (referralCode) {
          const refCacheKey = `${TELEGRAM_REF_CAPTURE_PREFIX}${referralCode}`;
          const hasCapturedReferral = safeSessionStorage.getItem(refCacheKey) === "1";

          if (!hasCapturedReferral) {
            await fetch(
              `/api/affiliate/capture?ref=${encodeURIComponent(referralCode)}&mode=json`,
              {
                credentials: "same-origin",
                cache: "no-store",
              },
            ).catch(() => undefined);
            safeSessionStorage.setItem(refCacheKey, "1");
          }
        }

        const response = await fetch("/api/auth/telegram/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ initData, referralCode, botUsername }),
        });

        if (!response.ok) {
          return;
        }

        if (cancelled) {
          return;
        }

        safeSessionStorage.setJSON(TELEGRAM_SESSION_CACHE_KEY, {
          initData,
          botUsername,
        });
        redirectToTarget();
      } catch {
        // Fail silently so the web shell stays usable outside Telegram.
      }
    }

    void syncTelegramSession();

    return () => {
      cancelled = true;
    };
  }, [botUsername, parsedStartParam.dramaId, pathname, referralCode, router, target]);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const backButton = webApp?.BackButton;

    if (!webApp || !backButton || !supportsTelegramBackButton(webApp)) {
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
