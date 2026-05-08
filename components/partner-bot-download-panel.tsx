"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Captions, Download, Film, LoaderCircle, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { triggerSelectionHaptic } from "@/lib/haptics";
import type { PartnerDownloadBotOption, PartnerDownloadQuota } from "@/lib/partner-downloads";
import { isTelegramMiniAppRuntime } from "@/lib/telegram-web-app";

type SearchResult = {
  id: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
  tags: string[];
};

type PartnerDownloadDrama = {
  episodeTotal: number;
  id: string;
  initialEpisode?: number;
  providerName?: string;
  thumbUrl?: string | null;
  title: string;
};

type PartnerPromoDownloadResponse = {
  dramaId: string;
  title: string;
  provider: string;
  episodeIndex: number;
  sourceType: "mp4" | "hls";
  downloadable: boolean;
  message: string;
  quota: PartnerDownloadQuota;
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

type SearchResponse = {
  results: SearchResult[];
  total: number;
  minimumQueryLength: number;
};

type PartnerBotDownloadPanelProps = {
  bots: PartnerDownloadBotOption[];
  className?: string;
  fixedDrama?: PartnerDownloadDrama;
  title?: string;
};

const EMPTY_SEARCH: SearchResponse = {
  results: [],
  total: 0,
  minimumQueryLength: 2,
};

async function readJsonResponse<T>(response: Response, fallbackMessage: string) {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(fallbackMessage);
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
      .slice(0, 96) || "partner-video";

  return filename.toLowerCase().endsWith(".mp4") ? filename : `${filename}.mp4`;
}

function getSubtitleLabel(subtitle: PartnerPromoDownloadResponse["subtitle"] | null) {
  if (!subtitle) {
    return "Belum dicek";
  }

  return subtitle.status === "available"
    ? "Subtitle akan dibakar"
    : "Tanpa subtitle Indonesia";
}

function quotaLabel(quota: PartnerDownloadQuota | null) {
  if (!quota?.enabled) {
    return "Download partner nonaktif.";
  }

  return `Sisa ${quota.remaining}/${quota.dailyLimit} episode hari ini.`;
}

export function PartnerBotDownloadPanel({
  bots,
  className,
  fixedDrama,
  title = "Download partner",
}: PartnerBotDownloadPanelProps) {
  const [selectedBotUsername, setSelectedBotUsername] = useState(
    bots[0]?.botUsername ?? "",
  );
  const selectedBot = bots.find((bot) => bot.botUsername === selectedBotUsername) ?? bots[0] ?? null;
  const [quota, setQuota] = useState<PartnerDownloadQuota | null>(
    selectedBot
      ? {
          dailyLimit: selectedBot.dailyLimit,
          enabled: selectedBot.enabled,
          periodKey: "",
          remaining: selectedBot.remaining,
          used: selectedBot.used,
        }
      : null,
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [search, setSearch] = useState<SearchResponse>(EMPTY_SEARCH);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDrama, setSelectedDrama] = useState<PartnerDownloadDrama | null>(
    fixedDrama ?? null,
  );
  const [selectedEpisode, setSelectedEpisode] = useState(
    Math.max(1, fixedDrama?.initialEpisode ?? 1),
  );
  const [resolvedPromo, setResolvedPromo] =
    useState<PartnerPromoDownloadResponse | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const episodeOptions = useMemo(() => {
    const total = Math.max(1, selectedDrama?.episodeTotal ?? 1);
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [selectedDrama?.episodeTotal]);

  useEffect(() => {
    const bot = bots.find((item) => item.botUsername === selectedBotUsername);

    if (!bot) {
      return;
    }

    setQuota({
      dailyLimit: bot.dailyLimit,
      enabled: bot.enabled,
      periodKey: "",
      remaining: bot.remaining,
      used: bot.used,
    });
    setResolvedPromo(null);
    setError("");

    const controller = new AbortController();
    const params = new URLSearchParams({ botUsername: bot.botUsername });

    fetch(`/api/partner/promo-download/quota?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) =>
        readJsonResponse<{ quota?: PartnerDownloadQuota; error?: string }>(
          response,
          "Gagal membaca quota download.",
        ).then((payload) => {
          if (!response.ok) {
            throw new Error(payload.error || "Gagal membaca quota download.");
          }
          if (payload.quota) {
            setQuota(payload.quota);
          }
        }),
      )
      .catch((quotaError) => {
        if (!controller.signal.aborted) {
          setError(
            quotaError instanceof Error
              ? quotaError.message
              : "Gagal membaca quota download.",
          );
        }
      });

    return () => controller.abort();
  }, [bots, selectedBotUsername]);

  useEffect(() => {
    if (fixedDrama || deferredQuery.length < EMPTY_SEARCH.minimumQueryLength) {
      setSearch(EMPTY_SEARCH);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ q: deferredQuery, limit: "8" });

    setIsSearching(true);
    fetch(`/api/search?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) =>
        readJsonResponse<SearchResponse & { error?: string }>(
          response,
          "Pencarian drama gagal.",
        ).then((payload) => {
          if (!response.ok) {
            throw new Error(payload.error || "Pencarian drama gagal.");
          }
          setSearch(payload);
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setSearch(EMPTY_SEARCH);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      });

    return () => controller.abort();
  }, [deferredQuery, fixedDrama]);

  async function prepareDownload() {
    if (!selectedBot || !selectedDrama) {
      setError("Pilih bot partner dan drama terlebih dahulu.");
      return;
    }

    setIsResolving(true);
    setError("");
    setToast("");

    try {
      const params = new URLSearchParams({
        botUsername: selectedBot.botUsername,
        internalDramaId: selectedDrama.id,
        episodeIndex: String(selectedEpisode),
      });
      const response = await fetch(`/api/partner/promo-download?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await readJsonResponse<
        PartnerPromoDownloadResponse & { error?: string }
      >(response, "Gagal menyiapkan download partner.");

      if (!response.ok) {
        throw new Error(payload.error || "Gagal menyiapkan download partner.");
      }

      setResolvedPromo(payload);
      setQuota(payload.quota);
      setToast("Source download siap.");
      triggerSelectionHaptic();
    } catch (prepareError) {
      setResolvedPromo(null);
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "Gagal menyiapkan download partner.",
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

  if (bots.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <div className="rounded-[1.55rem] border border-accent/25 bg-black/24 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <Download className="mr-2 size-3.5" />
              Partner download
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white lg:text-lg">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {quotaLabel(quota)}
            </p>
          </div>

          {bots.length > 1 ? (
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
                Bot
              </span>
              <select
                value={selectedBotUsername}
                onChange={(event) => setSelectedBotUsername(event.currentTarget.value)}
                className="h-11 rounded-full border border-white/10 bg-white/6 px-4 text-sm text-white outline-none"
              >
                {bots.map((bot) => (
                  <option key={bot.id} value={bot.botUsername} className="bg-[#151018]">
                    @{bot.botUsername}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {!fixedDrama ? (
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex h-11 items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4">
              <Search className="size-4 text-white/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari judul untuk download"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/38"
              />
            </div>
            <div className="grid content-center text-sm text-white/48">
              {isSearching ? "Mencari..." : `${search.total} hasil`}
            </div>
          </div>
        ) : null}

        {!fixedDrama && search.results.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {search.results.map((drama) => (
              <button
                key={drama.id}
                type="button"
                onClick={() => {
                  setSelectedDrama({
                    episodeTotal: drama.episodeCount,
                    id: drama.id,
                    providerName: drama.providerName,
                    thumbUrl: drama.thumbUrl,
                    title: drama.title,
                  });
                  setSelectedEpisode(1);
                  setResolvedPromo(null);
                  setError("");
                  triggerSelectionHaptic();
                }}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                  selectedDrama?.id === drama.id
                    ? "border-accent/45 bg-accent/10"
                    : "border-white/10 bg-white/5 hover:bg-white/8"
                }`}
              >
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-xl bg-black/25">
                  {drama.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={drama.thumbUrl}
                      alt={drama.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      <Film className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold text-white">
                    {drama.title}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {drama.episodeCount} episode · {drama.providerName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              Episode
            </span>
            <select
              value={selectedEpisode}
              disabled={!selectedDrama}
              onChange={(event) => {
                setSelectedEpisode(Number(event.currentTarget.value));
                setResolvedPromo(null);
                setError("");
                setToast("");
              }}
              className="h-11 w-full rounded-full border border-white/10 bg-white/6 px-4 text-sm text-white outline-none disabled:opacity-50"
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
            ) : selectedDrama ? (
              selectedDrama.title
            ) : (
              "Pilih drama dan episode."
            )}
          </div>

          <Button
            type="button"
            disabled={isResolving || !selectedDrama || !quota?.enabled || quota.remaining <= 0}
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
