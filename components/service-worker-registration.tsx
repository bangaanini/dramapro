"use client";

import { useEffect } from "react";

import {
  PWA_SERVICE_WORKER_READY_EVENT,
  storePwaInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      storePwaInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      };
    }

    const isSecureOrigin =
      window.location.protocol === "https:" ||
      ["localhost", "127.0.0.1"].includes(window.location.hostname);

    if (!isSecureOrigin) {
      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      };
    }

    let isMounted = true;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        await navigator.serviceWorker.ready;

        if (isMounted) {
          window.dispatchEvent(new Event(PWA_SERVICE_WORKER_READY_EVENT));
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
