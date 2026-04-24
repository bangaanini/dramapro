"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type SyncAllJobPayload = {
  id: string;
  status: string;
  languageCode: string;
  phase: string;
  platformIndex: number;
  currentPlatformId: string;
  currentTabName: string;
  totalPlatforms: number;
  completedPlatforms: number;
  totalTabs: number;
  completedTabs: number;
  totalTitles: number;
  totalEpisodes: number;
  pendingDetails: number;
  processedDetails: number;
  errorCount: number;
  recentErrors: Array<{
    at: string;
    level: string;
    message: string;
    platformId?: string;
  }>;
  recentLogs: Array<{
    at: string;
    level: string;
    message: string;
    platformId?: string;
  }>;
  lastMessage: string;
  progressPercent: number;
  isWorkerActive: boolean;
  leaseExpiresAt: string | null;
  lastHeartbeatAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type DashboardPayload = {
  platform: {
    id: string;
    name: string;
  };
  language: {
    id: string;
    code: string;
  };
  platforms: Array<{
    id: string;
    name: string;
    isDefault: boolean;
  }>;
  languages: Array<{
    id: string;
    code: string;
    isDefault: boolean;
  }>;
  providerSummaries: Array<{
    id: string;
    name: string;
    isCurrent: boolean;
    isHomepageVisible: boolean;
    languageCount: number;
    tabCount: number;
    titleCount: number;
    episodeCount: number;
  }>;
  stats: {
    tabCount: number;
    seriesCount: number;
    episodeCount: number;
    tabsWithMorePages: number;
    pendingDetailCount: number;
  };
  tabs: Array<{
    id: string;
    type: string;
    name: string;
    storedSeriesCount: number;
    syncStatus: string;
    hasMore: boolean;
  }>;
  syncJob: SyncAllJobPayload | null;
};

type ActionResult = {
  ok?: boolean;
  error?: string;
  syncJob?: SyncAllJobPayload | null;
  dashboard?: DashboardPayload;
  result?: unknown;
};

type AdminSyncPanelProps = {
  adminName: string;
  adminEmail: string;
  initialDashboard: DashboardPayload | null;
};

export function AdminSyncPanel({
  adminName,
  adminEmail,
  initialDashboard,
}: AdminSyncPanelProps) {
  function formatHeartbeat(value: string | null) {
    if (!value) {
      return "";
    }

    return value.replace("T", " ").replace("Z", "").slice(0, 19);
  }

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(
    initialDashboard,
  );
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    initialDashboard?.platform.id ?? "",
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    initialDashboard?.language.code ?? "",
  );
  const [isLoading, setIsLoading] = useState(!initialDashboard);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [syncJob, setSyncJob] = useState<SyncAllJobPayload | null>(
    initialDashboard?.syncJob ?? null,
  );
  const [hasMounted, setHasMounted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard(
    platformArg?: string,
    languageArg?: string,
    options?: {
      silent?: boolean;
    },
  ) {
    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      const platform = platformArg || selectedPlatform;
      const language = languageArg || selectedLanguage;

      if (platform) {
        params.set("platform", platform);
      }

      if (language) {
        params.set("language", language);
      }

      const response = await fetch(`/api/admin/catalog-sync?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as DashboardPayload & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Gagal memuat status sync.");
      }

      setDashboard(payload);
      setSyncJob(payload.syncJob ?? null);
      setSelectedPlatform(payload.platform.id);
      setSelectedLanguage(payload.language.code);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat status sync.",
      );
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (initialDashboard) {
      return;
    }

    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDashboard]);

  const hasActiveSyncJob =
    syncJob?.status === "queued" || syncJob?.status === "running";

  useEffect(() => {
    if (!hasMounted || !selectedPlatform || !selectedLanguage) {
      return;
    }

    const pollMs = hasActiveSyncJob ? 3000 : 5000;
    const intervalId = window.setInterval(() => {
      void loadDashboard(selectedPlatform, selectedLanguage, {
        silent: true,
      });
    }, pollMs);

    return () => {
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasActiveSyncJob,
    hasMounted,
    selectedLanguage,
    selectedPlatform,
    syncJob?.id,
  ]);

  async function runSyncRequest(
    mode: "start-sync-all" | "set-provider-homepage-visibility",
    options?: {
      platform?: string;
      isHomepageVisible?: boolean;
      successMessage?: string;
      busyKey?: string;
    },
  ) {
    setBusyKey(options?.busyKey ?? mode);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/catalog-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          jobId: syncJob?.id,
          platform: options?.platform ?? selectedPlatform,
          language: selectedLanguage,
          isHomepageVisible: options?.isHomepageVisible,
        }),
      });
      const payload = (await response.json()) as ActionResult;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Aksi ${mode} gagal.`);
      }

      if (payload.dashboard) {
        setDashboard(payload.dashboard);
        setSelectedPlatform(payload.dashboard.platform.id);
        setSelectedLanguage(payload.dashboard.language.code);
      }

      if (payload.syncJob) {
        setSyncJob(payload.syncJob);
        setMessage(
          options?.successMessage ||
            payload.syncJob.lastMessage ||
            "Job sync masuk antrean.",
        );
      } else {
        setMessage(options?.successMessage || "Perubahan berhasil disimpan.");
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : `Aksi ${mode} gagal.`,
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function startSyncAll() {
    await runSyncRequest("start-sync-all");
  }

  async function setProviderHomepageVisibility(
    platformId: string,
    isHomepageVisible: boolean,
  ) {
    await runSyncRequest("set-provider-homepage-visibility", {
      platform: platformId,
      isHomepageVisible,
      successMessage: isHomepageVisible
        ? "Provider ditampilkan lagi di homepage."
        : "Provider disembunyikan dari homepage.",
      busyKey: `provider-visibility:${platformId}`,
    });
  }

  const canResumeSync = hasActiveSyncJob;
  const isSyncBusy = Boolean(busyKey);
  const syncAllDisabled = hasMounted
    ? isSyncBusy || canResumeSync
    : undefined;
  const numberFormatter = new Intl.NumberFormat("id-ID");
  const workerStatusLabel = !syncJob
    ? "Belum ada job"
    : syncJob.status === "queued"
      ? syncJob.isWorkerActive
        ? "Sedang di-claim worker"
        : "Menunggu worker"
      : syncJob.status === "running"
        ? syncJob.isWorkerActive
          ? "Worker aktif"
          : "Worker stale/offline"
        : syncJob.status;

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-[1.75rem] border-white/10">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                Sync katalog
              </Badge>
              <h2 className="mt-3 text-xl font-semibold text-white">
                {adminName}
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {adminEmail}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPlatform}
                onChange={(event) => {
                  const nextPlatform = event.target.value;
                  setSelectedPlatform(nextPlatform);
                  void loadDashboard(nextPlatform, selectedLanguage);
                }}
                disabled={isLoading || Boolean(busyKey)}
                className="h-10 rounded-full border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
              >
                {dashboard?.platforms.map((platform) => (
                  <option key={platform.id} value={platform.id} className="bg-slate-950">
                    {platform.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedLanguage}
                onChange={(event) => {
                  const nextLanguage = event.target.value;
                  setSelectedLanguage(nextLanguage);
                  void loadDashboard(selectedPlatform, nextLanguage);
                }}
                disabled={isLoading || Boolean(busyKey)}
                className="h-10 rounded-full border border-white/10 bg-black/20 px-4 text-sm uppercase text-white outline-none"
              >
                {dashboard?.languages.map((language) => (
                  <option key={language.id} value={language.code} className="bg-slate-950">
                    {language.code.toUpperCase()}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void loadDashboard(selectedPlatform, selectedLanguage);
                }}
                disabled={isLoading}
                className="rounded-full"
              >
                {isLoading ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 size-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {dashboard ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard label="Bahasa" value={dashboard.language.code.toUpperCase()} />
              <StatCard label="Tab" value={String(dashboard.stats.tabCount)} />
              <StatCard label="Series" value={String(dashboard.stats.seriesCount)} />
              <StatCard label="Episode" value={String(dashboard.stats.episodeCount)} />
              <StatCard label="Pending" value={String(dashboard.stats.pendingDetailCount)} />
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">
                  Sync all provider
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Klik sekali untuk enqueue job. Worker Node akan mengindex judul dan metadata dulu, lalu mengaudit episode di background.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    void startSyncAll();
                  }}
                  disabled={syncAllDisabled}
                  className="rounded-full"
                >
                  {busyKey === "start-sync-all" ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Sync all
                </Button>
              </div>
            </div>

            {syncJob ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span>{syncJob.status}</span>
                    <span>{syncJob.progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${syncJob.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard
                    label="Provider"
                    value={`${numberFormatter.format(syncJob.completedPlatforms)}/${numberFormatter.format(syncJob.totalPlatforms)}`}
                  />
                  <StatCard
                    label="Tab selesai"
                    value={`${numberFormatter.format(syncJob.completedTabs)}/${numberFormatter.format(syncJob.totalTabs)}`}
                  />
                  <StatCard
                    label="Judul"
                    value={numberFormatter.format(syncJob.totalTitles)}
                  />
                  <StatCard
                    label="Episode"
                    value={numberFormatter.format(syncJob.totalEpisodes)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-sm text-white">
                    {syncJob.lastMessage || "Menunggu step berikutnya."}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Phase: {syncJob.phase}
                    {syncJob.currentPlatformId ? ` / ${syncJob.currentPlatformId}` : ""}
                    {syncJob.currentTabName ? ` / ${syncJob.currentTabName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Pending audit: {numberFormatter.format(syncJob.pendingDetails)} · Lolos audit: {numberFormatter.format(syncJob.processedDetails)} · Error: {numberFormatter.format(syncJob.errorCount)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Worker: {workerStatusLabel}
                    {syncJob.lastHeartbeatAt
                      ? ` · Heartbeat ${formatHeartbeat(syncJob.lastHeartbeatAt)}`
                      : ""}
                  </p>
                </div>

                {syncJob.recentLogs.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Log terakhir
                    </p>
                    <div className="space-y-2">
                      {syncJob.recentLogs.slice(-6).reverse().map((item) => (
                        <div
                          key={`${item.at}:${item.message}`}
                          className="text-xs text-[var(--muted)]"
                        >
                          <span className={item.level === "error" ? "text-red-200" : "text-emerald-100"}>
                            {item.level === "error" ? "ERROR" : "OK"}
                          </span>{" "}
                          {item.message}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {canResumeSync && !syncJob.isWorkerActive ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Job sedang menunggu worker background. Pastikan proses `worker:catalog-sync` atau `worker:scheduler` aktif di server.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {message ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {dashboard ? (
        <Card className="glass-panel rounded-[1.75rem] border-white/10">
          <CardContent className="space-y-4 p-5">
            <div>
              <Badge className="border-accent/30 bg-accent-soft text-accent">
                Database katalog
              </Badge>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Ringkasan semua provider aktif
              </h3>
              <p className="text-sm text-[var(--muted)]">
                Menampilkan isi database saat ini, bukan status upstream live.
              </p>
            </div>

            <div className="overflow-x-auto rounded-[1.2rem] border border-white/10 bg-black/10">
              <table className="min-w-full text-left text-sm text-white">
                <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Homepage</th>
                    <th className="px-4 py-3">Bahasa</th>
                    <th className="px-4 py-3">Tab</th>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Episode</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.providerSummaries.map((item) => (
                    <tr key={item.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{item.name}</span>
                          {item.isCurrent ? (
                            <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-accent">
                              aktif
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">{item.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              item.isHomepageVisible
                                ? "rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100"
                                : "rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-100"
                            }
                          >
                            {item.isHomepageVisible ? "Tampil" : "Hidden"}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={Boolean(busyKey)}
                            onClick={() => {
                              void setProviderHomepageVisibility(
                                item.id,
                                !item.isHomepageVisible,
                              );
                            }}
                            className="rounded-full"
                          >
                            {busyKey === `provider-visibility:${item.id}` ? (
                              <LoaderCircle className="mr-2 size-4 animate-spin" />
                            ) : null}
                            {item.isHomepageVisible ? "Hide" : "Unhide"}
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{numberFormatter.format(item.languageCount)}</td>
                      <td className="px-4 py-3">{numberFormatter.format(item.tabCount)}</td>
                      <td className="px-4 py-3">{numberFormatter.format(item.titleCount)}</td>
                      <td className="px-4 py-3">{numberFormatter.format(item.episodeCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
