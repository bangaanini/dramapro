"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Captions,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { isTelegramMiniAppRuntime } from "@/lib/telegram-web-app";

type PromoDownloadResponse = {
  dramaId: string;
  title: string;
  provider: string;
  episodeIndex: number;
  sourceType: "mp4" | "hls";
  downloadable: boolean;
  message: string;
  subtitle: {
    mode: "burn-in";
    status: "available" | "missing";
    label: string | null;
    language: string | null;
  };
  bestDownload: {
    label: string;
    mimeType: string;
    sourceUrl: string;
    downloadUrl: string;
  } | null;
  mp4Qualities: Array<{
    label: string;
    mimeType: string;
    sourceUrl: string;
    downloadUrl: string;
  }>;
  hlsQualities: Array<{
    label: string;
    mimeType: string;
    sourceUrl: string;
    downloadUrl: string;
  }>;
};

type DramaDetailAdminDownloadPanelProps = {
  dramaId: string;
  episodeTotal: number;
  initialEpisode: number;
  className?: string;
};

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const compactText = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);

    throw new Error(
      compactText ||
        `${fallbackMessage} Server mengembalikan response non-JSON (${response.status}).`,
    );
  }
}

function toAbsoluteClientUrl(url: string) {
  return new URL(url, window.location.origin).toString();
}

function buildPromoDownloadFilename(label: string) {
  const filename =
    label
      .replace(/[^\w\s.-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 96) || "promo-video";

  return filename.toLowerCase().endsWith(".mp4") ? filename : `${filename}.mp4`;
}

function getSubtitleLabel(subtitle: PromoDownloadResponse["subtitle"] | null) {
  if (!subtitle) {
    return "Belum dicek";
  }

  return subtitle.status === "available"
    ? "Subtitle akan dibakar"
    : "Tanpa subtitle Indonesia";
}

export function DramaDetailAdminDownloadPanel({
  dramaId,
  episodeTotal,
  initialEpisode,
  className,
}: DramaDetailAdminDownloadPanelProps) {
  const safeEpisodeTotal = Math.max(1, episodeTotal);
  const episodeOptions = useMemo(
    () => Array.from({ length: safeEpisodeTotal }, (_, index) => index + 1),
    [safeEpisodeTotal],
  );
  const [selectedEpisode, setSelectedEpisode] = useState(
    Math.min(Math.max(1, initialEpisode), safeEpisodeTotal),
  );
  const [resolvedPromo, setResolvedPromo] = useState<PromoDownloadResponse | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function prepareDownload() {
    setIsResolving(true);
    setError("");
    setToast("");

    try {
      const params = new URLSearchParams({
        internalDramaId: dramaId,
        episodeIndex: String(selectedEpisode),
      });
      const response = await fetch(
        `/api/admin/promo-download?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = await readJsonResponse<
        PromoDownloadResponse & {
          detail?: string;
          error?: string;
        }
      >(response, "Gagal menyiapkan download.");

      if (!response.ok) {
        throw new Error(
          payload.detail || payload.error || "Gagal menyiapkan download.",
        );
      }

      setResolvedPromo(payload);
      setToast("Source download siap.");
      triggerSelectionHaptic();
    } catch (prepareError) {
      setResolvedPromo(null);
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "Gagal menyiapkan download.",
      );
    } finally {
      setIsResolving(false);
    }
  }

  function openDownload(downloadUrl: string, label: string) {
    const absoluteUrl = toAbsoluteClientUrl(downloadUrl);
    const filename = buildPromoDownloadFilename(label);
    const webApp = window.Telegram?.WebApp;

    triggerSelectionHaptic();

    try {
      if (webApp && isTelegramMiniAppRuntime(webApp)) {
        if (webApp.downloadFile && absoluteUrl.startsWith("https://")) {
          webApp.downloadFile(
            {
              url: absoluteUrl,
              file_name: filename,
            },
            (accepted) => {
              setToast(
                accepted
                  ? "Telegram mulai menyiapkan download."
                  : "Permintaan download dibatalkan.",
              );
            },
          );
          return;
        }

        if (webApp.openLink) {
          webApp.openLink(absoluteUrl, { try_instant_view: false });
          setToast("Link download dibuka di browser eksternal.");
          return;
        }
      }
    } catch {
      setToast("Membuka download lewat browser.");
    }

    window.location.assign(absoluteUrl);
  }

  const qualityOptions = resolvedPromo
    ? [...resolvedPromo.mp4Qualities, ...resolvedPromo.hlsQualities]
    : [];

  return (
    <section
      className={
        className ??
        "mx-auto w-full max-w-6xl px-4 pb-7 sm:px-6 lg:max-w-5xl lg:px-8"
      }
    >
      <div className="rounded-[1.55rem] border border-accent/25 bg-black/24 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.24)] lg:rounded-[1.35rem]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <ShieldCheck className="mr-2 size-3.5" />
              Admin download
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white lg:text-lg">
              Download episode dari halaman detail
            </h2>
            
          </div>

          <Link
            href="/admin/promo-downloader"
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium text-white/78 transition hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="mr-2 size-4" />
            Panel lengkap
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              Episode
            </span>
            <select
              value={selectedEpisode}
              onChange={(event) => {
                setSelectedEpisode(Number(event.currentTarget.value));
                setResolvedPromo(null);
                setError("");
                setToast("");
              }}
              className="h-11 w-full rounded-full border border-white/10 bg-white/6 px-4 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
            >
              {episodeOptions.map((episode) => (
                <option key={episode} value={episode} className="bg-[#151018]">
                  Episode {episode}
                </option>
              ))}
            </select>
          </label>

          <div className="grid min-h-11 content-center rounded-[1rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/62">
            {resolvedPromo ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>{resolvedPromo.sourceType.toUpperCase()}</span>
                <span className="text-white/25">/</span>
                <span className="inline-flex items-center text-white/78">
                  <Captions className="mr-1.5 size-4" />
                  {getSubtitleLabel(resolvedPromo.subtitle)}
                </span>
              </div>
            ) : (
              "Pilih episode lalu siapkan source download."
            )}
          </div>

          <Button
            type="button"
            disabled={isResolving}
            onClick={() => void prepareDownload()}
            className="h-11 px-5"
          >
            {isResolving ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : resolvedPromo ? (
              <RefreshCw className="mr-2 size-4" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            {resolvedPromo ? "Cek ulang" : "Siapkan"}
          </Button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        {resolvedPromo ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/66">
              {resolvedPromo.message}
            </div>

            {resolvedPromo.bestDownload ? (
              <Button
                type="button"
                className="w-full justify-center md:w-auto"
                onClick={() =>
                  openDownload(
                    resolvedPromo.bestDownload?.downloadUrl ?? "",
                    `EP-${resolvedPromo.episodeIndex}-${resolvedPromo.bestDownload?.label ?? "download"}`,
                  )
                }
              >
                <Download className="mr-2 size-4" />
                Download rekomendasi
              </Button>
            ) : null}

            {qualityOptions.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {qualityOptions.map((quality) => (
                  <button
                    key={`${quality.label}-${quality.downloadUrl}`}
                    type="button"
                    onClick={() =>
                      openDownload(
                        quality.downloadUrl,
                        `EP-${resolvedPromo.episodeIndex}-${quality.label}`,
                      )
                    }
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {quality.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {toast ? (
          <div className="mt-4 text-sm leading-6 text-emerald-100/85">{toast}</div>
        ) : null}
      </div>
    </section>
  );
}
