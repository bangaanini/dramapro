"use client";

import { useState } from "react";
import { Check, LoaderCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import "@/lib/telegram-web-app";

type DramaDetailShareButtonProps = {
  title: string;
  shareUrl: string;
  telegramShareUrl?: string | null;
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
};

function buildTelegramShareUrl(title: string, shareUrl: string) {
  const text = `Tonton ${title} di Layar Drama`;
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
}

export function DramaDetailShareButton({
  title,
  shareUrl,
  telegramShareUrl,
  compact = false,
  iconOnly = false,
  className,
}: DramaDetailShareButtonProps) {
  const [state, setState] = useState<"idle" | "sharing" | "copied">("idle");

  async function handleShare() {
    if (state === "sharing") {
      return;
    }

    setState("sharing");

    try {
      const resolvedShareUrl = telegramShareUrl || shareUrl;
      const shareIntentUrl = buildTelegramShareUrl(title, resolvedShareUrl);
      const webApp = window.Telegram?.WebApp;

      if (webApp?.openTelegramLink) {
        webApp.openTelegramLink(shareIntentUrl);
        setState("idle");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title,
          text: `Tonton ${title} di Layar Drama`,
          url: shareUrl,
        });
        setState("idle");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("idle");
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={() => {
        void handleShare();
      }}
      className={
        className ??
        (compact
          ? "h-12 min-w-12 rounded-full px-0 sm:px-5"
          : "h-12 rounded-full px-5")
      }
      aria-busy={state === "sharing"}
      aria-label={state === "copied" ? "Link tersalin" : "Bagikan drama"}
    >
      {state === "sharing" ? (
        <LoaderCircle
          className={
            iconOnly
              ? "size-5 animate-spin"
              : compact
                ? "size-4 animate-spin sm:mr-2"
                : "mr-2 size-4 animate-spin"
          }
        />
      ) : state === "copied" ? (
        <Check
          className={
            iconOnly
              ? "size-5"
              : compact
                ? "size-4 sm:mr-2"
                : "mr-2 size-4"
          }
        />
      ) : (
        <Share2
          className={
            iconOnly
              ? "size-5"
              : compact
                ? "size-4 sm:mr-2"
                : "mr-2 size-4"
          }
        />
      )}
      <span
        className={
          iconOnly ? "sr-only" : compact ? "sr-only sm:not-sr-only" : undefined
        }
      >
        {state === "copied" ? "Link tersalin" : "Bagikan"}
      </span>
    </Button>
  );
}
