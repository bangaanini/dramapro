"use client";

import { useState } from "react";
import { Check, LoaderCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import "@/lib/telegram-web-app";

type DramaDetailShareButtonProps = {
  title: string;
  shareUrl: string;
  telegramShareUrl?: string | null;
};

function buildTelegramShareUrl(title: string, shareUrl: string) {
  const text = `Tonton ${title} di DramaPro`;
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
}

export function DramaDetailShareButton({
  title,
  shareUrl,
  telegramShareUrl,
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
          text: `Tonton ${title} di DramaPro`,
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
      className="h-12 rounded-full px-5"
      aria-busy={state === "sharing"}
    >
      {state === "sharing" ? (
        <LoaderCircle className="mr-2 size-4 animate-spin" />
      ) : state === "copied" ? (
        <Check className="mr-2 size-4" />
      ) : (
        <Share2 className="mr-2 size-4" />
      )}
      {state === "copied" ? "Link tersalin" : "Bagikan"}
    </Button>
  );
}
