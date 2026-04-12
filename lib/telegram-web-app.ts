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
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openTelegramLink?: (url: string) => void;
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

export {};
