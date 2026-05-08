"use client";

import { useSyncExternalStore } from "react";
import { Bell, MessageCircle, Send, Zap } from "lucide-react";

import { isTelegramMiniAppRuntime } from "@/lib/telegram-web-app";

type TelegramOpenBannerProps = {
  href: string;
};

function subscribeToRuntimeSnapshot() {
  return () => {};
}

function getClientShouldShowBanner() {
  return !isTelegramMiniAppRuntime(window.Telegram?.WebApp);
}

function getServerShouldShowBanner() {
  return false;
}

export function TelegramOpenBanner({ href }: TelegramOpenBannerProps) {
  const shouldShow = useSyncExternalStore(
    subscribeToRuntimeSnapshot,
    getClientShouldShowBanner,
    getServerShouldShowBanner,
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-3 pb-2 sm:px-4 lg:px-8">
      <div className="relative overflow-hidden rounded-[1.15rem] border border-cyan-300/10 bg-[#061021]/92 px-4 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.34)] sm:px-6 lg:px-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_13%_45%,rgba(24,173,255,0.18),transparent_27%),linear-gradient(90deg,rgba(255,255,255,0.04),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20">
              <Send className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">
                Lebih Seru di Telegram!
              </h2>
              <p className="mt-1 text-xs text-white/52">
                Pengalaman nonton terbaik langsung dari chat dan Mini App.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/45">
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="size-3.5 text-cyan-300/80" />
                  Lebih cepat & ringan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Bell className="size-3.5 text-cyan-300/80" />
                  Notifikasi episode baru
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="size-3.5 text-cyan-300/80" />
                  Langsung dari chat
                </span>
              </div>
            </div>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 text-sm font-semibold text-[#03111a] shadow-[0_16px_34px_rgba(34,211,238,0.22)] transition hover:brightness-110"
          >
            <Send className="size-4" />
            Buka di Telegram
          </a>
        </div>
      </div>
    </section>
  );
}
