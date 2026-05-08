"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  ExternalLink,
  LoaderCircle,
  MessageCircle,
  Send,
  Share2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { isTelegramMiniAppRuntime } from "@/lib/telegram-web-app";

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

function buildWhatsAppShareUrl(title: string, shareUrl: string) {
  const text = `Tonton ${title} di Layar Drama\n${shareUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildFacebookShareUrl(shareUrl: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
}

function buildXShareUrl(title: string, shareUrl: string) {
  const text = `Tonton ${title} di Layar Drama`;
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
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
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  async function handleShare() {
    if (state === "sharing") {
      return;
    }

    setState("sharing");

    try {
      const webApp = window.Telegram?.WebApp;

      if (isTelegramMiniAppRuntime(webApp) && webApp?.openTelegramLink) {
        const resolvedShareUrl = telegramShareUrl || shareUrl;
        const shareIntentUrl = buildTelegramShareUrl(title, resolvedShareUrl);
        webApp.openTelegramLink(shareIntentUrl);
        setState("idle");
        return;
      }

      setIsShareSheetOpen(true);
      setState("idle");
    } catch {
      setState("idle");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setState("copied");
      setIsShareSheetOpen(false);
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("idle");
    }
  }

  const telegramWebShareUrl = buildTelegramShareUrl(title, shareUrl);
  const whatsappShareUrl = buildWhatsAppShareUrl(title, shareUrl);
  const facebookShareUrl = buildFacebookShareUrl(shareUrl);
  const xShareUrl = buildXShareUrl(title, shareUrl);
  const shareSheet =
    isShareSheetOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 px-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-[calc(4rem_+_env(safe-area-inset-top))] backdrop-blur-lg sm:items-center sm:p-6">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Tutup bagikan"
              onClick={() => setIsShareSheetOpen(false)}
            />
            <section className="relative z-10 w-full max-w-[430px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#090b18]/98 p-4 text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,122,69,0.16),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(34,211,238,0.12),transparent_28%)]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">
                      Bagikan serial
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-white">
                      {title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShareSheetOpen(false)}
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/62 transition hover:bg-white/10 hover:text-white"
                    aria-label="Tutup"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <ShareSheetLink href={whatsappShareUrl} label="WhatsApp">
                    <MessageCircle className="size-4" />
                  </ShareSheetLink>
                  <ShareSheetLink href={telegramWebShareUrl} label="Telegram">
                    <Send className="size-4" />
                  </ShareSheetLink>
                  <ShareSheetLink href={facebookShareUrl} label="Facebook">
                    <ExternalLink className="size-4" />
                  </ShareSheetLink>
                  <ShareSheetLink href={xShareUrl} label="X">
                    <ExternalLink className="size-4" />
                  </ShareSheetLink>
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(255,122,69,0.25)] transition hover:bg-[var(--accent-strong)]"
                  >
                    <Copy className="size-4" />
                    Salin link
                  </button>
                </div>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
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

      {shareSheet}
    </>
  );
}

function ShareSheetLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
    >
      {children}
      {label}
    </a>
  );
}
