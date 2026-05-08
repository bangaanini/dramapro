"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  shouldTrackAnalyticsPath,
  trackAnalyticsEvent,
} from "@/lib/analytics/client";

const HEARTBEAT_INTERVAL_MS = 60_000;

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const path = queryString ? `${pathname}?${queryString}` : pathname;

  useEffect(() => {
    if (!shouldTrackAnalyticsPath(path)) {
      return;
    }

    trackAnalyticsEvent({ type: "page_view", path });
  }, [path]);

  useEffect(() => {
    if (!shouldTrackAnalyticsPath(path)) {
      return;
    }

    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      trackAnalyticsEvent({ type: "heartbeat", path });
    };

    const intervalId = window.setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL_MS,
    );

    window.addEventListener("focus", sendHeartbeat);
    document.addEventListener("visibilitychange", sendHeartbeat);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", sendHeartbeat);
      document.removeEventListener("visibilitychange", sendHeartbeat);
    };
  }, [path]);

  return null;
}
