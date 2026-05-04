export type TelegramBackButton = {
  show?: () => void;
  hide?: () => void;
  onClick?: (callback: () => void) => void;
  offClick?: (callback: () => void) => void;
};

export type TelegramHapticFeedback = {
  impactOccurred?: (style?: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred?: (type?: "error" | "success" | "warning") => void;
  selectionChanged?: () => void;
};

export type TelegramHomeScreenStatus =
  | "unsupported"
  | "unknown"
  | "added"
  | "missed";

export type TelegramHomeScreenEventPayload =
  | TelegramHomeScreenStatus
  | {
      status?: TelegramHomeScreenStatus;
      error?: string;
    }
  | null
  | undefined;

export type TelegramWebApp = {
  initData?: string;
  version?: string;
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openLink?: (
    url: string,
    options?: {
      try_instant_view?: boolean;
    },
  ) => void;
  openTelegramLink?: (url: string) => void;
  downloadFile?: (
    params: {
      url: string;
      file_name: string;
    },
    callback?: (accepted: boolean) => void,
  ) => void;
  addToHomeScreen?: () => void;
  checkHomeScreenStatus?: (
    callback?: (status: TelegramHomeScreenStatus) => void,
  ) => void;
  onEvent?: (
    eventType: "homeScreenAdded" | "homeScreenChecked" | "homeScreenFailed",
    eventHandler: (payload?: TelegramHomeScreenEventPayload) => void,
  ) => void;
  offEvent?: (
    eventType: "homeScreenAdded" | "homeScreenChecked" | "homeScreenFailed",
    eventHandler: (payload?: TelegramHomeScreenEventPayload) => void,
  ) => void;
  HapticFeedback?: TelegramHapticFeedback;
  BackButton?: TelegramBackButton;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

function parseTelegramVersion(version: string | undefined) {
  if (!version) {
    return [];
  }

  return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

export function isTelegramWebAppVersionAtLeast(
  webApp: TelegramWebApp | undefined,
  minimumVersion: string,
) {
  const currentParts = parseTelegramVersion(webApp?.version);
  const minimumParts = parseTelegramVersion(minimumVersion);
  const maxLength = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (currentPart > minimumPart) {
      return true;
    }

    if (currentPart < minimumPart) {
      return false;
    }
  }

  return true;
}

export function isTelegramMiniAppRuntime(webApp: TelegramWebApp | undefined) {
  return Boolean(webApp?.initData && webApp.initData.trim().length > 0);
}

export function supportsTelegramHomeScreen(webApp: TelegramWebApp | undefined) {
  return (
    isTelegramMiniAppRuntime(webApp) &&
    isTelegramWebAppVersionAtLeast(webApp, "8.0")
  );
}

export function supportsTelegramBackButton(webApp: TelegramWebApp | undefined) {
  return (
    isTelegramMiniAppRuntime(webApp) &&
    isTelegramWebAppVersionAtLeast(webApp, "6.1")
  );
}

export {};
