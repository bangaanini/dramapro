"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle, Share2 } from "lucide-react";

import "@/lib/telegram-web-app";

function buildTelegramShareUrl(link: string) {
  return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Gabung lewat link referral Layar Drama ini.")}`;
}

export function AffiliateLinkCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    if (isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      const telegramShareUrl = buildTelegramShareUrl(link);
      const webApp = window.Telegram?.WebApp;

      if (webApp?.openTelegramLink) {
        webApp.openTelegramLink(telegramShareUrl);
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "Referral Layar Drama",
          text: "Gabung ke Layar Drama lewat link referral ini.",
          url: link,
        });
        return;
      }

      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(59,34,20,0.96),rgba(24,18,18,0.96))] p-4 shadow-[0_28px_64px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">Link Referral Anda</p>
          <p className="mt-1 text-sm leading-6 text-white/60">
            Bagikan link ini untuk mendapatkan komisi 25% dari pembelian VIP user referral.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/72">
          1 klik bagikan
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/22 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-white/42">Link</p>
        <p className="mt-2 break-all text-sm text-white/90">{link}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Tersalin" : "Salin"}
        </button>

        <button
          type="button"
          onClick={() => {
            void handleShare();
          }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#ffb548,#ff7a1a)] px-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(255,126,46,0.24)] transition hover:brightness-105"
        >
          {isSharing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Share2 className="size-4" />
          )}
          {isSharing ? "Membuka..." : "Bagikan"}
        </button>
      </div>
    </section>
  );
}
