"use client";

import "@/lib/telegram-web-app";

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore unsupported or blocked vibration calls.
  }
}

export function triggerSelectionHaptic() {
  const haptics = window.Telegram?.WebApp?.HapticFeedback;

  if (haptics?.selectionChanged) {
    haptics.selectionChanged();
    return;
  }

  vibrate(8);
}

export function triggerImpactHaptic(
  style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light",
) {
  const haptics = window.Telegram?.WebApp?.HapticFeedback;

  if (haptics?.impactOccurred) {
    haptics.impactOccurred(style);
    return;
  }

  const fallbackPattern =
    style === "heavy" ? [12, 8, 12] : style === "medium" ? 12 : 10;
  vibrate(fallbackPattern);
}
