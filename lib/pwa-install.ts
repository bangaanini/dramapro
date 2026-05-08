"use client";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export const PWA_INSTALL_PROMPT_READY_EVENT = "dramapro:pwa-install-prompt-ready";
export const PWA_INSTALL_MODAL_REQUEST_EVENT = "dramapro:pwa-install-modal-request";
export const PWA_SERVICE_WORKER_READY_EVENT = "dramapro:pwa-service-worker-ready";
const PWA_INSTALLED_KEY = "dramapro.pwa.installed";

declare global {
  interface Window {
    __dramaproBeforeInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function isStandaloneDisplayMode() {
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

export function getStoredPwaInstallPrompt() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__dramaproBeforeInstallPrompt ?? null;
}

export function storePwaInstallPrompt(event: BeforeInstallPromptEvent) {
  if (typeof window === "undefined") {
    return;
  }

  window.__dramaproBeforeInstallPrompt = event;
  window.dispatchEvent(new Event(PWA_INSTALL_PROMPT_READY_EVENT));
}

export function requestPwaInstallModal() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(PWA_INSTALL_MODAL_REQUEST_EVENT));
}

export function clearStoredPwaInstallPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  window.__dramaproBeforeInstallPrompt = null;
}

export function isPwaMarkedInstalled() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(PWA_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPwaInstalled() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PWA_INSTALLED_KEY, "1");
  } catch {
    // Ignore storage failures in restrictive browser modes.
  }
}
