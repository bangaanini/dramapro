"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";

import {
  clearStoredPwaInstallPrompt,
  getStoredPwaInstallPrompt,
  isPwaMarkedInstalled,
  isStandaloneDisplayMode,
  markPwaInstalled,
  PWA_INSTALL_MODAL_REQUEST_EVENT,
  PWA_INSTALL_PROMPT_READY_EVENT,
  PWA_SERVICE_WORKER_READY_EVENT,
  storePwaInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";
import type {
  TelegramHomeScreenEventPayload,
  TelegramHomeScreenStatus,
} from "@/lib/telegram-web-app";
import "@/lib/telegram-web-app";
import { supportsTelegramHomeScreen } from "@/lib/telegram-web-app";
import { cn } from "@/lib/utils";

type PwaInstallBannerProps = {
  autoShow?: boolean;
  siteName?: string;
};

function normalizeTelegramHomeScreenStatus(
  payload?: TelegramHomeScreenEventPayload,
): TelegramHomeScreenStatus | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  return payload.status ?? null;
}

function isMobileLikeViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return (
    window.matchMedia("(max-width: 820px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function getManualInstallMessage() {
  if (typeof navigator === "undefined") {
    return "Buka menu browser, lalu pilih Install app atau Add to Home screen.";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isChrome = /chrome|crios|chromium/.test(userAgent);

  if (isIOS) {
    return "Di iPhone, tap Share lalu pilih Add to Home Screen.";
  }

  if (isChrome) {
    return "Di Chrome, tap menu titik tiga lalu pilih Install app.";
  }

  return "Buka menu browser, lalu pilih Install app atau Add to Home screen.";
}

export function PwaInstallBanner({
  autoShow = false,
  siteName = "Layar Drama",
}: PwaInstallBannerProps) {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [homeScreenStatus, setHomeScreenStatus] =
    useState<TelegramHomeScreenStatus | "idle">("idle");
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isForcedOpen, setIsForcedOpen] = useState(false);
  const [isMobileLike, setIsMobileLike] = useState(false);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isStandalone = useMemo(() => {
    if (homeScreenStatus === "added" || isPwaMarkedInstalled()) {
      return true;
    }

    return false;
  }, [homeScreenStatus]);

  useEffect(() => {
    setIsMobileLike(isMobileLikeViewport());
    setInstallPromptEvent(getStoredPwaInstallPrompt());

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 820px)")
        : null;
    const pointerQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(pointer: coarse)")
        : null;
    const updateViewport = () => {
      setIsMobileLike(isMobileLikeViewport());
    };

    mediaQuery?.addEventListener?.("change", updateViewport);
    pointerQuery?.addEventListener?.("change", updateViewport);

    return () => {
      mediaQuery?.removeEventListener?.("change", updateViewport);
      pointerQuery?.removeEventListener?.("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (isStandaloneDisplayMode()) {
      setHomeScreenStatus("added");
      markPwaInstalled();
    }

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    const handleDisplayModeChange = () => {
      if (isStandaloneDisplayMode()) {
        setHomeScreenStatus("added");
        markPwaInstalled();
      }
    };

    mediaQuery?.addEventListener?.("change", handleDisplayModeChange);

    return () => {
      mediaQuery?.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    const syncStoredInstallPrompt = () => {
      setInstallPromptEvent(getStoredPwaInstallPrompt());
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;

      storePwaInstallPrompt(promptEvent);
      setInstallPromptEvent(promptEvent);
      setIsDismissed(false);
    };
    const handleAppInstalled = () => {
      setHomeScreenStatus("added");
      markPwaInstalled();
      clearStoredPwaInstallPrompt();
      setInstallPromptEvent(null);
      setMessage(`${siteName} sudah terpasang.`);
    };

    syncStoredInstallPrompt();
    window.addEventListener(
      PWA_INSTALL_PROMPT_READY_EVENT,
      syncStoredInstallPrompt,
    );
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        PWA_INSTALL_PROMPT_READY_EVENT,
        syncStoredInstallPrompt,
      );
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [siteName]);

  useEffect(() => {
    const handleServiceWorkerReady = () => {
      setIsServiceWorkerReady(true);
      setInstallPromptEvent(getStoredPwaInstallPrompt());
    };

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      handleServiceWorkerReady();
    }

    window.addEventListener(
      PWA_SERVICE_WORKER_READY_EVENT,
      handleServiceWorkerReady,
    );

    return () => {
      window.removeEventListener(
        PWA_SERVICE_WORKER_READY_EVENT,
        handleServiceWorkerReady,
      );
    };
  }, []);

  useEffect(() => {
    const handleInstallRequest = () => {
      if (isStandaloneDisplayMode() || isPwaMarkedInstalled()) {
        setHomeScreenStatus("added");
        setMessage(`${siteName} sudah terpasang.`);
        return;
      }

      setIsForcedOpen(true);
      setIsDismissed(false);
      setMessage(null);
      setIsMobileLike(true);
      setInstallPromptEvent(getStoredPwaInstallPrompt());
    };

    window.addEventListener(PWA_INSTALL_MODAL_REQUEST_EVENT, handleInstallRequest);

    return () => {
      window.removeEventListener(
        PWA_INSTALL_MODAL_REQUEST_EVENT,
        handleInstallRequest,
      );
    };
  }, [siteName]);

  useEffect(() => {
    const telegramWebApp = window.Telegram?.WebApp;

    if (!telegramWebApp || !supportsTelegramHomeScreen(telegramWebApp)) {
      return;
    }

    setIsMobileLike(true);

    const handleHomeScreenAdded = () => {
      setHomeScreenStatus("added");
      markPwaInstalled();
      clearStoredPwaInstallPrompt();
      setMessage(`${siteName} sudah terpasang.`);
    };

    const handleHomeScreenChecked = (payload?: TelegramHomeScreenEventPayload) => {
      const status = normalizeTelegramHomeScreenStatus(payload);

      if (status) {
        setHomeScreenStatus(status);
        if (status === "added") {
          markPwaInstalled();
        }
      }
    };

    const handleHomeScreenFailed = (payload?: TelegramHomeScreenEventPayload) => {
      if (payload && typeof payload !== "string" && payload.error === "UNSUPPORTED") {
        setHomeScreenStatus("unsupported");
        return;
      }

      if (isStandaloneDisplayMode()) {
        setHomeScreenStatus("added");
        markPwaInstalled();
      }
    };

    try {
      telegramWebApp.onEvent?.("homeScreenAdded", handleHomeScreenAdded);
      telegramWebApp.onEvent?.("homeScreenChecked", handleHomeScreenChecked);
      telegramWebApp.onEvent?.("homeScreenFailed", handleHomeScreenFailed);
      telegramWebApp.checkHomeScreenStatus?.((status) => {
        setHomeScreenStatus(status);
        if (status === "added") {
          markPwaInstalled();
        }
      });
    } catch {
      setHomeScreenStatus("unsupported");
    }

    return () => {
      telegramWebApp.offEvent?.("homeScreenAdded", handleHomeScreenAdded);
      telegramWebApp.offEvent?.("homeScreenChecked", handleHomeScreenChecked);
      telegramWebApp.offEvent?.("homeScreenFailed", handleHomeScreenFailed);
    };
  }, [siteName]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [message]);

  async function handleInstall(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    event?.stopPropagation();

    if (isInstalling || homeScreenStatus === "added" || isStandaloneDisplayMode()) {
      setHomeScreenStatus("added");
      markPwaInstalled();
      setMessage(`${siteName} sudah terpasang.`);
      return;
    }

    setIsInstalling(true);

    try {
      const telegramWebApp = window.Telegram?.WebApp;

      if (telegramWebApp && supportsTelegramHomeScreen(telegramWebApp)) {
        try {
          telegramWebApp.addToHomeScreen?.();
          setMessage("Telegram sedang membuka pilihan install.");
        } catch {
          setHomeScreenStatus("unsupported");
        }
        return;
      }

      const promptEvent = installPromptEvent ?? getStoredPwaInstallPrompt();

      if (promptEvent && typeof promptEvent.prompt === "function") {
        try {
          await promptEvent.prompt();
        } catch {
          clearStoredPwaInstallPrompt();
          setInstallPromptEvent(null);
          setMessage(
            "Prompt install belum siap. Tunggu beberapa detik lalu klik Install lagi.",
          );
          return;
        }

        const choice = await promptEvent.userChoice;
        const accepted = choice?.outcome === "accepted";

        if (accepted || isStandaloneDisplayMode()) {
          setHomeScreenStatus("added");
          markPwaInstalled();
          setMessage(`${siteName} berhasil diinstall.`);
          clearStoredPwaInstallPrompt();
          setInstallPromptEvent(null);
          return;
        }

        setMessage("Install app dibatalkan.");
        clearStoredPwaInstallPrompt();
        setInstallPromptEvent(null);
        return;
      }

      if (!window.isSecureContext) {
        setMessage("Install app hanya tersedia di HTTPS atau localhost.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        setMessage("Browser ini belum mendukung install PWA.");
        return;
      }

      setMessage(
        isServiceWorkerReady
          ? getManualInstallMessage()
          : "Menyiapkan install app. Tunggu halaman selesai dimuat, lalu klik Install lagi.",
      );
    } finally {
      setIsInstalling(false);
    }
  }

  function dismissBanner() {
    setIsDismissed(true);
    setIsForcedOpen(false);
  }

  if (
    (!autoShow && !isForcedOpen) ||
    isDismissed ||
    !isMobileLike ||
    isStandalone ||
    isStandaloneDisplayMode()
  ) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(5.75rem+env(safe-area-inset-top))] z-[90] px-4 sm:top-24">
      <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-[1.25rem] border border-white/36 bg-[radial-gradient(circle_at_84%_50%,rgba(212,0,98,0.24),transparent_32%),linear-gradient(135deg,rgba(63,49,70,0.96),rgba(35,29,44,0.97))] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-tight text-white">
            Download {siteName}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/68">
            {message ?? `Tonton lebih nyaman dengan aplikasi ${siteName}`}
          </p>
        </div>

        <button
          type="button"
          onClick={(event) => {
            void handleInstall(event);
          }}
          disabled={isInstalling}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[1rem] bg-[#d40062] px-4 text-base font-semibold text-white shadow-[0_14px_34px_rgba(212,0,98,0.32)] transition hover:bg-[#ec0875] active:scale-[0.985]",
            isInstalling ? "opacity-80" : "",
          )}
        >
          {isInstalling ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <Download className="size-5" strokeWidth={2.4} />
          )}
          Install
        </button>

        <button
          type="button"
          onClick={dismissBanner}
          aria-label="Tutup banner install"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <X className="size-6" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
