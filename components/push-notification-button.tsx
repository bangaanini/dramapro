"use client";

import { useEffect, useState } from "react";
import { BellRing, LoaderCircle } from "lucide-react";

import {
  getCurrentPushSubscription,
  isPushNotificationSupported,
  subscribeToPushNotifications,
  syncExistingPushSubscription,
} from "@/lib/push-notification-client";
import { cn } from "@/lib/utils";

type PushNotificationButtonProps = {
  className?: string;
  label?: string;
  variant?: "menu" | "card";
};

export function PushNotificationButton({
  className,
  label = "Aktifkan Notifikasi",
  variant = "menu",
}: PushNotificationButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushNotificationSupported()) {
      setIsSupported(false);
      return;
    }

    let isMounted = true;

    setIsSupported(true);

    async function hydrate() {
      const existingSubscription = await getCurrentPushSubscription();
      const subscription =
        Notification.permission === "granted"
          ? await syncExistingPushSubscription().catch(() => existingSubscription)
          : existingSubscription;

      if (!isMounted) {
        return;
      }

      setIsEnabled(Boolean(subscription && Notification.permission === "granted"));
    }

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleEnable() {
    if (!isSupported || isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await subscribeToPushNotifications();
      setIsEnabled(true);
      setMessage("Notifikasi aktif.");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Notifikasi gagal diaktifkan.";
      setMessage(nextMessage);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupported) {
    return null;
  }

  if (variant === "card") {
    return (
      <div className={cn("rounded-[1.4rem] border border-white/10 bg-white/5 p-4", className)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">
              {isEnabled ? "Notifikasi aktif" : label}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {message ??
                (isEnabled
                  ? "Kamu akan menerima update penting dari Layar Drama."
                  : "Dapatkan info drama baru, promo VIP, dan pesan penting.")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleEnable}
            disabled={isLoading || isEnabled}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-default disabled:opacity-70"
          >
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <BellRing className="size-4" />
            )}
            {isEnabled ? "Aktif" : "Aktifkan"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={isLoading || isEnabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white disabled:cursor-default disabled:opacity-70",
        className,
      )}
      title={message ?? undefined}
    >
      {isLoading ? (
        <LoaderCircle className="size-4.5 animate-spin" />
      ) : (
        <BellRing className="size-4.5" />
      )}
      <span>{isEnabled ? "Notifikasi Aktif" : label}</span>
    </button>
  );
}
