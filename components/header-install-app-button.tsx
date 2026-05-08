"use client";

import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";

import { triggerSelectionHaptic } from "@/lib/haptics";
import {
  clearStoredPwaInstallPrompt,
  getStoredPwaInstallPrompt,
  isStandaloneDisplayMode,
  markPwaInstalled,
  PWA_INSTALL_PROMPT_READY_EVENT,
  requestPwaInstallModal,
  storePwaInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";
import "@/lib/telegram-web-app";
import { supportsTelegramHomeScreen } from "@/lib/telegram-web-app";

export function HeaderInstallAppButton() {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const syncStoredInstallPrompt = () => {
      setInstallPromptEvent(getStoredPwaInstallPrompt());
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;

      storePwaInstallPrompt(promptEvent);
      setInstallPromptEvent(promptEvent);
    };
    const handleAppInstalled = () => {
      clearStoredPwaInstallPrompt();
      markPwaInstalled();
      setInstallPromptEvent(null);
    };

    syncStoredInstallPrompt();
    window.addEventListener(
      PWA_INSTALL_PROMPT_READY_EVENT,
      syncStoredInstallPrompt,
    );
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const telegramWebApp = window.Telegram?.WebApp;
    telegramWebApp?.onEvent?.("homeScreenAdded", handleAppInstalled);

    return () => {
      window.removeEventListener(
        PWA_INSTALL_PROMPT_READY_EVENT,
        syncStoredInstallPrompt,
      );
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      telegramWebApp?.offEvent?.("homeScreenAdded", handleAppInstalled);
    };
  }, []);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isInstalling) {
      return;
    }

    triggerSelectionHaptic();

    if (isStandaloneDisplayMode()) {
      return;
    }

    setIsInstalling(true);

    try {
      const telegramWebApp = window.Telegram?.WebApp;

      if (telegramWebApp && supportsTelegramHomeScreen(telegramWebApp)) {
        try {
          telegramWebApp.addToHomeScreen?.();
          return;
        } catch {
          // Fall back to native browser prompt when available.
        }
      }

      const promptEvent = installPromptEvent ?? getStoredPwaInstallPrompt();

      if (!promptEvent || typeof promptEvent.prompt !== "function") {
        requestPwaInstallModal();
        return;
      }

      try {
        await promptEvent.prompt();
      } catch {
        clearStoredPwaInstallPrompt();
        setInstallPromptEvent(null);
        requestPwaInstallModal();
        return;
      }

      const choice = await promptEvent.userChoice;

      if (choice?.outcome === "accepted" || isStandaloneDisplayMode()) {
        markPwaInstalled();
      }

      clearStoredPwaInstallPrompt();
      setInstallPromptEvent(null);
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        void handleClick(event);
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
    >
      {isInstalling ? (
        <LoaderCircle className="size-4.5 animate-spin" />
      ) : (
        <Download className="size-4.5" />
      )}
      <span>Download App</span>
    </button>
  );
}
