"use client";

import { useEffect } from "react";

import {
  isPushNotificationSupported,
  syncExistingPushSubscription,
} from "@/lib/push-notification-client";

const AUTO_SYNC_KEY = "dramapro.push.lastAutoSync";
const AUTO_SYNC_INTERVAL_MS = 1000 * 60 * 10;

export function PushNotificationAutoSync() {
  useEffect(() => {
    if (!isPushNotificationSupported() || Notification.permission !== "granted") {
      return;
    }

    const lastSync = Number.parseInt(
      window.localStorage.getItem(AUTO_SYNC_KEY) ?? "0",
      10,
    );

    if (Number.isFinite(lastSync) && Date.now() - lastSync < AUTO_SYNC_INTERVAL_MS) {
      return;
    }

    window.localStorage.setItem(AUTO_SYNC_KEY, String(Date.now()));
    void syncExistingPushSubscription().catch(() => {
      window.localStorage.removeItem(AUTO_SYNC_KEY);
    });
  }, []);

  return null;
}
