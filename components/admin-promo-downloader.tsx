"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Film,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { triggerSelectionHaptic } from "@/lib/haptics";

type SearchResult = {
  id: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
  tags: string[];
};

type SearchResponse = {
  results: SearchResult[];
  total: number;
  minimumQueryLength: number;
};

type PromoDownloadResponse = {
  dramaId: string;
  title: string;
  provider: string;
  episodeIndex: number;
  sourceType: "mp4" | "hls";
  downloadable: boolean;
  message: string;
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
    ffmpegCommand: string;
  }>;
};

type PromoDownloadBatchJob = {
  id: string;
  episodeIndex: number;
  status: "queued" | "processing" | "done" | "failed";
  sourceType: string;
  qualityLabel: string;
  fileSizeBytes: number | null;
  error: string;
  downloadUrl: string | null;
};

type PromoDownloadBatchResponse = {
  dramaId: string;
  title: string;
  provider: string;
  episodeCount: number;
  counts: {
    queued: number;
    processing: number;
    done: number;
    failed: number;
  };
  jobs: PromoDownloadBatchJob[];
};

const DEFAULT_EMPTY_RESPONSE: SearchResponse = {
  results: [],
  total: 0,
  minimumQueryLength: 3,
};

export function AdminPromoDownloader() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>(DEFAULT_EMPTY_RESPONSE);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedDrama, setSelectedDrama] = useState<SearchResult | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [resolvedPromo, setResolvedPromo] = useState<PromoDownloadResponse | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<PromoDownloadBatchResponse | null>(null);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim());
  const canSearch = deferredQuery.length >= DEFAULT_EMPTY_RESPONSE.minimumQueryLength;
  const batchIsActive = Boolean(
    batchStatus &&
      (batchStatus.counts.queued > 0 || batchStatus.counts.processing > 0),
  );

  const loadBatchStatus = useCallback(async (dramaId: string, showLoading = false) => {
    if (showLoading) {
      setIsBatchLoading(true);
    }
    setBatchError(null);

    try {
      const params = new URLSearchParams({ internalDramaId: dramaId });
      const response = await fetch(
        `/api/admin/promo-download/batch?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as PromoDownloadBatchResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Gagal membaca status download.");
      }

      setBatchStatus(payload);
    } catch (error) {
      setBatchError(
        error instanceof Error ? error.message : "Gagal membaca status download.",
      );
    } finally {
      if (showLoading) {
        setIsBatchLoading(false);
      }
    }
  }, []);

  async function enqueueAllDownloads() {
    if (!selectedDrama) {
      return;
    }

    setIsBatchLoading(true);
    setBatchError(null);

    try {
      const response = await fetch("/api/admin/promo-download/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ internalDramaId: selectedDrama.id }),
      });
      const payload = (await response.json()) as PromoDownloadBatchResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Gagal membuat antrean download.");
      }

      setBatchStatus(payload);
      setToast("Antrean download semua episode dibuat.");
    } catch (error) {
      setBatchError(
        error instanceof Error ? error.message : "Gagal membuat antrean download.",
      );
    } finally {
      setIsBatchLoading(false);
    }
  }

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!selectedDrama) {
      setBatchStatus(null);
      setBatchError(null);
      setIsBatchLoading(false);
      return;
    }

    void loadBatchStatus(selectedDrama.id, true);
  }, [loadBatchStatus, selectedDrama]);

  useEffect(() => {
    if (!selectedDrama || !batchIsActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadBatchStatus(selectedDrama.id);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [batchIsActive, loadBatchStatus, selectedDrama]);

  useEffect(() => {
    if (!canSearch) {
      setResults(DEFAULT_EMPTY_RESPONSE);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      setIsSearching(true);
      setSearchError(null);

      try {
        const searchParams = new URLSearchParams({
          q: deferredQuery,
          limit: "12",
        });
        const response = await fetch(`/api/search?${searchParams.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as SearchResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Pencarian drama gagal.");
        }

        setResults({
          results: payload.results,
          total: payload.total,
          minimumQueryLength: payload.minimumQueryLength,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResults(DEFAULT_EMPTY_RESPONSE);
        setSearchError(
          error instanceof Error ? error.message : "Pencarian drama gagal.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }

    void runSearch();

    return () => controller.abort();
  }, [canSearch, deferredQuery]);

  useEffect(() => {
    if (!selectedDrama || !selectedEpisode) {
      setResolvedPromo(null);
      setResolveError(null);
      return;
    }

    const activeDrama = selectedDrama;
    const activeEpisode = selectedEpisode;
    const controller = new AbortController();

    async function resolveEpisode() {
      setIsResolving(true);
      setResolveError(null);

      try {
        const params = new URLSearchParams({
          internalDramaId: activeDrama.id,
          episodeIndex: String(activeEpisode),
        });
        const response = await fetch(
          `/api/admin/promo-download?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as PromoDownloadResponse & {
          error?: string;
          detail?: string;
        };

        if (!response.ok) {
          throw new Error(payload.detail || payload.error || "Gagal menyiapkan source promo.");
        }

        setResolvedPromo(payload);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResolvedPromo(null);
        setResolveError(
          error instanceof Error
            ? error.message
            : "Gagal menyiapkan source promo.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsResolving(false);
        }
      }
    }

    void resolveEpisode();

    return () => controller.abort();
  }, [selectedDrama, selectedEpisode]);

  const episodeList = useMemo(() => {
    if (!selectedDrama) {
      return [];
    }

    return Array.from({ length: selectedDrama.episodeCount }, (_, index) => index + 1);
  }, [selectedDrama]);

  async function copyToClipboard(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      triggerSelectionHaptic();
      setToast(successMessage);
    } catch {
      setToast("Gagal menyalin link promo.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-white/10 bg-black/20 p-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">
                Cari judul drama
              </span>
              <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3">
                <Search className="size-4 text-[var(--muted-foreground)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Minimal 3 karakter"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            </label>
          </div>

          <div className="rounded-[1.7rem] border border-white/10 bg-black/18 p-4">
            {!canSearch ? (
              <EmptyState
                icon={Sparkles}
                title="Mulai cari judul drama"
                description="Ketik minimal 3 karakter untuk menampilkan drama yang relevan dari database lokal."
              />
            ) : isSearching ? (
              <LoadingState label="Mencari judul drama..." />
            ) : searchError ? (
              <ErrorState message={searchError} />
            ) : results.results.length === 0 ? (
              <EmptyState
                icon={Film}
                title="Drama tidak ditemukan"
                description="Coba kata kunci lain atau jalankan sync metadata jika katalog belum terisi."
              />
            ) : (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {results.total} hasil terkait
                </p>

                {results.results.map((drama) => {
                  const isSelected = selectedDrama?.id === drama.id;

                  return (
                    <button
                      key={drama.id}
                      type="button"
                      onPointerDown={() => triggerSelectionHaptic()}
                      onClick={() => {
                        setSelectedDrama(drama);
                        setSelectedEpisode(1);
                      }}
                      className={`flex w-full items-center gap-4 rounded-[1.4rem] border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-accent/45 bg-accent/10"
                          : "border-white/10 bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        {drama.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={drama.thumbUrl}
                            alt={drama.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/30">
                            <Film className="size-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-white">
                          {drama.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {drama.episodeCount} episode
                        </p>
                        {drama.tags.length > 0 ? (
                          <p className="mt-1 line-clamp-1 text-xs text-white/45">
                            {drama.tags.slice(0, 3).join(" • ")}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-white/10 bg-black/20 p-4">
            {selectedDrama ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    Drama dipilih
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {selectedDrama.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {selectedDrama.episodeCount} episode • provider {selectedDrama.providerName}
                  </p>
                </div>

                <div className="grid max-h-[18rem] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 xl:grid-cols-7">
                  {episodeList.map((episode) => {
                    const isSelected = selectedEpisode === episode;

                    return (
                      <button
                        key={episode}
                        type="button"
                        onPointerDown={() => triggerSelectionHaptic()}
                        onClick={() => setSelectedEpisode(episode)}
                        className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? "border-accent/45 bg-accent/12 text-white"
                            : "border-white/10 bg-white/5 text-[var(--muted)] hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        EP.{episode}
                      </button>
                    );
                  })}
                </div>

                <BatchDownloadPanel
                  status={batchStatus}
                  isLoading={isBatchLoading}
                  error={batchError}
                  onStart={enqueueAllDownloads}
                  onRefresh={() => void loadBatchStatus(selectedDrama.id, true)}
                />
              </div>
            ) : (
              <EmptyState
                icon={Film}
                title="Pilih drama terlebih dahulu"
                description="Setelah drama dipilih, episode akan muncul di panel ini untuk diambil source promonya."
              />
            )}
          </div>

          <Card className="rounded-[1.8rem] border-white/10 bg-white/4">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                  Hasil source promo
                </p>
                {selectedDrama && selectedEpisode ? (
                  <p className="mt-2 text-sm text-white/65">
                    {isResolving
                      ? "Sedang menyiapkan source promo..."
                      : `EP.${selectedEpisode} • ${selectedDrama.title}`}
                  </p>
                ) : null}
              </div>

              {!selectedDrama || !selectedEpisode ? (
                <EmptyState
                  icon={Download}
                  title="Belum ada episode dipilih"
                  description="Pilih drama dan episode untuk menampilkan source promo."
                />
              ) : isResolving ? (
                <LoadingState label="Sedang menyiapkan source promo..." />
              ) : resolveError ? (
                <ErrorState message={resolveError} />
              ) : resolvedPromo ? (
                <div className="space-y-4">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {resolvedPromo.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          EP.{resolvedPromo.episodeIndex} • {resolvedPromo.provider} •{" "}
                          {resolvedPromo.sourceType.toUpperCase()}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-white">
                        {resolvedPromo.downloadable ? "Downloadable" : "Fallback link"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {resolvedPromo.message}
                    </p>
                  </div>

                  {resolvedPromo.bestDownload ? (
                    <BestDownloadCard
                      downloadUrl={resolvedPromo.bestDownload.downloadUrl}
                      label={resolvedPromo.bestDownload.label}
                      sourceUrl={resolvedPromo.bestDownload.sourceUrl}
                      onCopy={copyToClipboard}
                    />
                  ) : null}

                  {resolvedPromo.mp4Qualities.length > 1 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">
                        Pilih kualitas MP4
                      </p>
                      {resolvedPromo.mp4Qualities.map((quality) => (
                        <div
                          key={`${quality.label}-${quality.downloadUrl}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-white/10 bg-white/4 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {quality.label}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {quality.mimeType}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={quality.downloadUrl}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium text-white"
                            >
                              Download
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  quality.sourceUrl,
                                  `Link ${quality.label} berhasil disalin.`,
                                )
                              }
                            >
                              <Copy className="mr-2 size-4" />
                              Salin
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {resolvedPromo.hlsQualities.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">
                        Fallback source HLS
                      </p>
                      {resolvedPromo.hlsQualities.map((quality) => (
                        <div
                          key={`${quality.label}-${quality.sourceUrl}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-white/10 bg-white/4 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {quality.label}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {quality.mimeType}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={quality.downloadUrl}
                              className="inline-flex h-9 items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-white"
                            >
                              <Download className="mr-2 size-4" />
                              Download MP4
                            </a>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                copyToClipboard(
                                  quality.sourceUrl,
                                  "Link HLS promo berhasil disalin.",
                                )
                              }
                            >
                              <Copy className="mr-2 size-4" />
                              Copy source .m3u8
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  quality.ffmpegCommand,
                                  "Command FFmpeg berhasil disalin.",
                                )
                              }
                            >
                              <Copy className="mr-2 size-4" />
                              Copy command
                            </Button>
                            <a
                              href={quality.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium text-white"
                            >
                              <ExternalLink className="mr-2 size-4" />
                              Buka source
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="Source promo akan tampil di sini"
                  description="Klik episode tertentu untuk menyiapkan hasil download atau fallback link HLS."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {toast ? (
        <div className="fixed inset-x-0 bottom-8 z-[90] flex justify-center px-4">
          <div className="rounded-full border border-white/10 bg-[rgba(24,16,15,0.94)] px-4 py-2 text-sm text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BatchDownloadPanel({
  status,
  isLoading,
  error,
  onStart,
  onRefresh,
}: {
  status: PromoDownloadBatchResponse | null;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onRefresh: () => void;
}) {
  const queued = status?.counts.queued ?? 0;
  const processing = status?.counts.processing ?? 0;
  const done = status?.counts.done ?? 0;
  const failed = status?.counts.failed ?? 0;
  const total = status?.episodeCount ?? 0;
  const active = queued + processing > 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Download semua episode</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Diproses oleh worker di background. Aman ditinggal dari halaman admin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onStart}
            disabled={isLoading || active}
          >
            {isLoading ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            {active ? "Sedang jalan" : "Download semua"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className="mt-3"><ErrorState message={error} /></div> : null}

      {status ? (
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-white/65">
              <span>{done}/{total} episode selesai</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs text-white/70">
            <StatusCounter label="Queue" value={queued} />
            <StatusCounter label="Proses" value={processing} />
            <StatusCounter label="Selesai" value={done} />
            <StatusCounter label="Gagal" value={failed} />
          </div>

          {status.jobs.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {status.jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      EP.{job.episodeIndex}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {job.qualityLabel || job.sourceType || "menunggu source"}
                      {job.fileSizeBytes ? ` • ${formatBytes(job.fileSizeBytes)}` : ""}
                    </p>
                    {job.status === "failed" && job.error ? (
                      <p className="mt-1 max-w-md text-xs text-red-200/80">
                        {job.error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${downloadStatusClass(job.status)}`}
                    >
                      {downloadStatusLabel(job.status)}
                    </span>
                    {job.downloadUrl ? (
                      <a
                        href={job.downloadUrl}
                        className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/6 px-3 text-xs font-medium text-white"
                      >
                        Download
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-[var(--muted)]">
              Belum ada antrean untuk drama ini.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StatusCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 px-2 py-2">
      <p className="text-base font-semibold text-white">{value}</p>
      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
    </div>
  );
}

function downloadStatusLabel(status: PromoDownloadBatchJob["status"]) {
  switch (status) {
    case "done":
      return "Selesai";
    case "processing":
      return "Proses";
    case "failed":
      return "Gagal";
    default:
      return "Queue";
  }
}

function downloadStatusClass(status: PromoDownloadBatchJob["status"]) {
  switch (status) {
    case "done":
      return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
    case "processing":
      return "border-sky-300/20 bg-sky-400/10 text-sky-100";
    case "failed":
      return "border-red-300/20 bg-red-400/10 text-red-100";
    default:
      return "border-white/10 bg-white/6 text-white/70";
  }
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function BestDownloadCard({
  downloadUrl,
  label,
  sourceUrl,
  onCopy,
}: {
  downloadUrl: string;
  label: string;
  sourceUrl: string;
  onCopy: (value: string, successMessage: string) => Promise<void>;
}) {
  return (
    <div className="rounded-[1.5rem] border border-emerald-400/18 bg-emerald-500/8 p-4">
      <p className="text-sm font-semibold text-white">
        Download kualitas terbaik
      </p>
      <p className="mt-1 text-xs text-emerald-100/75">{label}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={downloadUrl}
          className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-white shadow-[0_14px_30px_rgba(255,122,69,0.28)]"
        >
          <Download className="mr-2 size-4" />
          Download kualitas terbaik
        </a>
        <Button
          variant="secondary"
          onClick={() => onCopy(sourceUrl, "Link MP4 berhasil disalin.")}
        >
          <Copy className="mr-2 size-4" />
          Salin link
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-full border border-white/10 bg-white/5 p-3 text-accent">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-white">{title}</p>
        <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center gap-3 text-sm text-white">
      <LoaderCircle className="size-4 animate-spin text-accent" />
      {label}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {message}
    </div>
  );
}
