"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

import type { HomeProviderTab } from "@/lib/catalog-data";
import { cn } from "@/lib/utils";

type ProviderFilterModalProps = {
  open: boolean;
  providers: HomeProviderTab[];
  activePlatformId: string | null;
  onSelect: (platformId: string | null) => void;
  onClose: () => void;
};

export function ProviderFilterModal({
  open,
  providers,
  activePlatformId,
  onSelect,
  onClose,
}: ProviderFilterModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex flex-col items-stretch justify-end sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-filter-modal-title"
    >
      <button
        type="button"
        aria-label="Tutup modal filter provider"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 mx-auto flex w-full flex-col overflow-hidden border border-white/10",
          "bg-[#120c0b] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]",
          "rounded-t-[1.75rem]",
          "max-h-[calc(100dvh-3rem)]",
          "pb-[env(safe-area-inset-bottom)]",
          "sm:max-w-lg sm:rounded-[1.75rem] sm:max-h-[min(85dvh,40rem)] sm:pb-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/50">
              Filter drama
            </p>
            <h2
              id="provider-filter-modal-title"
              className="mt-1 text-lg font-semibold tracking-tight text-white"
            >
              Pilih provider
            </h2>
            <p className="mt-1 text-xs text-white/55">
              Tampilkan drama dari provider tertentu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className={cn(
              "mb-3 flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
              activePlatformId === null
                ? "border-accent/60 bg-accent/15 text-white"
                : "border-white/10 bg-white/[0.04] text-white/85 hover:border-white/25 hover:bg-white/[0.07]",
            )}
          >
            <div>
              <p className="text-sm font-semibold">Semua provider</p>
              <p className="mt-0.5 text-xs text-white/55">
                Tampilkan drama dari semua sumber.
              </p>
            </div>
            {activePlatformId === null ? (
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-white">
                <Check className="size-3.5" />
              </span>
            ) : null}
          </button>

          {providers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center text-sm text-white/55">
              Belum ada provider yang tersedia.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {providers.map((provider) => {
                const isActive = activePlatformId === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      onSelect(provider.id);
                      onClose();
                    }}
                    className={cn(
                      "group relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-3 text-center transition",
                      isActive
                        ? "border-accent/70 bg-accent/12 shadow-[0_0_0_1px_rgba(255,122,69,0.35)]"
                        : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.075]",
                    )}
                    aria-pressed={isActive}
                  >
                    {isActive ? (
                      <span className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-accent text-white">
                        <Check className="size-3" />
                      </span>
                    ) : null}

                    <div className="flex size-12 items-center justify-center">
                      {provider.logoUrl ? (
                        <Image
                          src={provider.logoUrl}
                          alt={`${provider.name} logo`}
                          width={48}
                          height={48}
                          className="size-12 object-contain"
                          sizes="48px"
                        />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-semibold uppercase text-white/75">
                          {provider.name.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="line-clamp-1 text-xs font-semibold text-white">
                        {provider.name}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/50">
                        {provider.seriesCount} judul
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
