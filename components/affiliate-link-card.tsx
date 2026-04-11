"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function AffiliateLinkCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
      <p className="text-lg font-semibold text-white">Link Referral Anda</p>
      <div className="mt-4 flex gap-3">
        <input
          readOnly
          value={link}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 text-white transition hover:border-accent/30 hover:bg-accent-soft"
          aria-label="Salin link referral"
          title="Salin link referral"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Bagikan link ini untuk mendapatkan komisi dari pembelian VIP user referral.
      </p>
    </div>
  );
}
