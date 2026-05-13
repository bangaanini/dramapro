"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, DatabaseZap, HeartPulse, Play, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProviderSyncDashboard } from "@/lib/provider-sync";
import type { CatalogParamDefinition, CatalogSectionDefinition, JsonRecord } from "@/lib/streamapi/types";

type AdminProviderSyncPanelProps = {
  initialDashboard: ProviderSyncDashboard;
};

type RequestMode = "init" | "health" | "enqueue" | "homepage-visibility";

type HealthPreviewItem = {
  externalId: string;
  title: string;
  status: "saved" | "new";
  seriesId: string | null;
  savedTitle: string | null;
};

type HealthPreview = {
  count: number;
  savedCount: number;
  newCount: number;
  durationMs: number;
  items: HealthPreviewItem[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function defaultParamValues(section: CatalogSectionDefinition | undefined) {
  const values: Record<string, string> = {};

  for (const param of section?.params ?? []) {
    if (param.type === "fixed" || param.name === "page") continue;
    values[param.name] = String(param.defaultValue ?? "");
  }

  return values;
}

function fixedParams(section: CatalogSectionDefinition | undefined) {
  return (section?.params ?? []).filter((param) => param.type === "fixed");
}

function editableParams(section: CatalogSectionDefinition | undefined) {
  return (section?.params ?? []).filter(
    (param) => param.type !== "fixed" && param.name !== "page",
  );
}

function toJsonRecord(params: Record<string, string>, section: CatalogSectionDefinition | undefined) {
  const output: JsonRecord = {};

  for (const param of editableParams(section)) {
    const value = params[param.name] ?? "";
    output[param.name] = param.type === "number" ? Number(value) : value;
  }

  for (const param of fixedParams(section)) {
    if (param.defaultValue !== undefined) {
      output[param.name] = param.defaultValue;
    }
  }

  return output;
}

export function AdminProviderSyncPanel({
  initialDashboard,
}: AdminProviderSyncPanelProps) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [providerCode, setProviderCode] = useState<string>(
    initialDashboard.providers[0]?.code ?? "",
  );
  const provider = useMemo(
    () => dashboard.providers.find((item) => item.code === providerCode) ?? dashboard.providers[0],
    [dashboard.providers, providerCode],
  );
  const [sectionValue, setSectionValue] = useState(provider?.sections[0]?.value ?? "");
  const section = useMemo(
    () => provider?.sections.find((item) => item.value === sectionValue) ?? provider?.sections[0],
    [provider, sectionValue],
  );
  const [page, setPage] = useState(section?.defaultPage ?? 1);
  const [params, setParams] = useState<Record<string, string>>(() => defaultParamValues(section));
  const [isLoading, setIsLoading] = useState<RequestMode | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [healthPreview, setHealthPreview] = useState<HealthPreview | null>(null);

  function applySection(nextSection: CatalogSectionDefinition | undefined) {
    setSectionValue(nextSection?.value ?? "");
    setPage(nextSection?.defaultPage ?? 1);
    setParams(defaultParamValues(nextSection));
  }

  useEffect(() => {
    const nextProvider = dashboard.providers.find((item) => item.code === providerCode) ?? dashboard.providers[0];
    const hasCurrentSection = nextProvider?.sections.some(
      (item) => item.value === sectionValue,
    );
    if (!hasCurrentSection) {
      const nextSection = nextProvider?.sections[0];
      setSectionValue(nextSection?.value ?? "");
      setPage(nextSection?.defaultPage ?? 1);
      setParams(defaultParamValues(nextSection));
    }
  }, [dashboard.providers, providerCode, sectionValue]);

  useEffect(() => {
    const hasActiveJob = dashboard.jobs.some((job) =>
      ["queued", "processing"].includes(job.status),
    );

    if (!hasActiveJob) return;

    const timer = window.setInterval(async () => {
      const response = await fetch("/api/admin/provider-sync", {
        cache: "no-store",
      });
      if (response.ok) {
        setDashboard(await response.json() as ProviderSyncDashboard);
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [dashboard.jobs]);

  async function refreshDashboard() {
    const response = await fetch("/api/admin/provider-sync", { cache: "no-store" });
    if (response.ok) {
      setDashboard(await response.json() as ProviderSyncDashboard);
    }
  }

  async function sendRequest(mode: RequestMode) {
    setIsLoading(mode);
    setNotice("");
    setError("");
    setHealthPreview(null);

    try {
      const response = await fetch("/api/admin/provider-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          provider: provider?.code,
          section: section?.value,
          page,
          params: toJsonRecord(params, section),
        }),
      });
      const data = await response.json() as {
        error?: string;
        dashboard?: ProviderSyncDashboard;
        health?: HealthPreview;
      };

      if (!response.ok) {
        throw new Error(data.error || "Request gagal.");
      }

      if (data.dashboard) {
        setDashboard(data.dashboard);
      }

      if (mode === "init") {
        setNotice("Provider StreamAPI siap, katalog legacy disembunyikan dari homepage.");
      } else if (mode === "health") {
        setHealthPreview(data.health ?? null);
        setNotice(
          `Health ok. Ditemukan ${formatNumber(data.health?.count ?? 0)} item: ${formatNumber(data.health?.savedCount ?? 0)} sudah tersimpan, ${formatNumber(data.health?.newCount ?? 0)} baru dalam ${formatNumber(data.health?.durationMs ?? 0)}ms.`,
        );
      } else {
        setNotice("Job sync masuk queue. Worker akan memproses di background.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Request provider sync gagal.",
      );
    } finally {
      setIsLoading(null);
    }
  }

  async function updateProviderHomepageVisibility(isHomepageVisible: boolean) {
    if (!provider) return;

    const selectedProvider = provider;
    setIsLoading("homepage-visibility");
    setNotice("");
    setError("");
    setHealthPreview(null);

    try {
      const response = await fetch("/api/admin/provider-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "homepage-visibility",
          provider: selectedProvider.code,
          isHomepageVisible,
        }),
      });
      const data = await response.json() as {
        error?: string;
        dashboard?: ProviderSyncDashboard;
      };

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan status homepage.");
      }

      if (data.dashboard) {
        setDashboard(data.dashboard);
      }

      setNotice(
        `${selectedProvider.name} sekarang ${isHomepageVisible ? "ditampilkan di" : "disembunyikan dari"} homepage.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal menyimpan status homepage.",
      );
    } finally {
      setIsLoading(null);
    }
  }

  const requestParams = {
    ...toJsonRecord(params, section),
    ...(section?.supportsPage ? { page } : {}),
  };

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.035]">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => sendRequest("init")}
              disabled={isLoading !== null}
            >
              <DatabaseZap className="mr-2 size-4" />
              Init StreamAPI
            </Button>
            <Button
              variant="outline"
              onClick={refreshDashboard}
              disabled={isLoading !== null}
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
            <Badge className="border-white/10 bg-white/5 text-[var(--muted)]">
              Bahasa: Indonesia otomatis
            </Badge>
          </div>

          {notice ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    Provider
                  </span>
                  <select
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none"
                    value={provider?.code ?? ""}
                    onChange={(event) => {
                      const nextProvider = dashboard.providers.find(
                        (item) => item.code === event.target.value,
                      );
                      setProviderCode(event.target.value);
                      applySection(nextProvider?.sections[0]);
                    }}
                  >
                    {dashboard.providers.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name} ({formatNumber(item.dramaCount)})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-white">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    Endpoint katalog/search
                  </span>
                  <select
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none"
                    value={section?.value ?? ""}
                    onChange={(event) => {
                      const nextSection = provider?.sections.find(
                        (item) => item.value === event.target.value,
                      );
                      applySection(nextSection);
                    }}
                  >
                    {provider?.sections.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white">
                <span className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                    checked={provider?.isHomepageVisible ?? true}
                    disabled={!provider || isLoading !== null}
                    onChange={(event) => {
                      void updateProviderHomepageVisibility(event.target.checked);
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      Tampilkan provider di homepage
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                      Sync tetap berjalan walaupun provider disembunyikan.
                    </span>
                  </span>
                </span>
                <Badge
                  className={
                    provider?.isHomepageVisible ?? true
                      ? "shrink-0 border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "shrink-0 border-white/10 bg-white/5 text-[var(--muted)]"
                  }
                >
                  {provider?.isHomepageVisible ?? true ? "Tampil" : "Sembunyi"}
                </Badge>
              </label>

              {section ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-white">{section.description}</p>
                  <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                    {section.pathLabel}
                  </p>
                </div>
              ) : null}

              {healthPreview?.items.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      Preview hasil health
                    </p>
                    <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
                      {formatNumber(healthPreview.savedCount)} tersimpan
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {healthPreview.items.map((item) => (
                      <div
                        key={`${item.externalId}-${item.status}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs"
                      >
                        <span className="min-w-0 truncate text-white">
                          {item.savedTitle || item.title}
                        </span>
                        <Badge
                          className={
                            item.status === "saved"
                              ? "shrink-0 border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                              : "shrink-0 border-sky-400/20 bg-sky-400/10 text-sky-100"
                          }
                        >
                          {item.status === "saved" ? "Sudah tersimpan" : "Baru"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {section?.supportsPage ? (
                  <FieldShell
                    label="Page"
                    help="Halaman upstream yang ingin diambil."
                  >
                    <input
                      className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none"
                      min={0}
                      type="number"
                      value={page}
                      onChange={(event) => setPage(Number(event.target.value))}
                    />
                  </FieldShell>
                ) : null}

                {editableParams(section).map((param) => (
                  <ParameterField
                    key={param.name}
                    param={param}
                    value={params[param.name] ?? ""}
                    onChange={(value) =>
                      setParams((current) => ({ ...current, [param.name]: value }))
                    }
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {fixedParams(section).map((param) => (
                  <Badge key={param.name} className="border-white/10 bg-white/5 text-white">
                    {param.name}={String(param.defaultValue ?? "")}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => sendRequest("enqueue")}
                  disabled={!provider || !section || isLoading !== null}
                >
                  <Play className="mr-2 size-4" />
                  Sync endpoint
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => sendRequest("health")}
                  disabled={!provider || !section || isLoading !== null}
                >
                  <HeartPulse className="mr-2 size-4" />
                  Cek health
                </Button>
              </div>
            </div>

            <div className="space-y-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Ringkasan request
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <SummaryRow label="Provider" value={provider?.name ?? "-"} />
                  <SummaryRow
                    label="Homepage"
                    value={provider?.isHomepageVisible ?? true ? "Tampil" : "Sembunyi"}
                  />
                  <SummaryRow label="Endpoint" value={section?.pathLabel ?? "-"} />
                  <SummaryRow
                    label="Parameter"
                    value={JSON.stringify(requestParams)}
                  />
                </dl>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Drama" value={formatNumber(provider?.dramaCount ?? 0)} />
                <MiniStat label="Episode" value={formatNumber(provider?.episodeCount ?? 0)} />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Job terbaru
                </p>
                <div className="mt-3 space-y-2">
                  {dashboard.jobs.slice(0, 5).map((job) => (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs text-[var(--muted)]"
                    >
                      <div className="flex items-center justify-between gap-2 text-white">
                        <span>{job.providerCode}/{String(job.payload.section ?? job.type)}</span>
                        <span>{job.status}</span>
                      </div>
                      {job.lastError ? (
                        <p className="mt-1 text-red-200">{job.lastError}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-black/30">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-white">
            <Activity className="size-4 text-accent" />
            Worker log
          </div>
          <div className="max-h-[360px] space-y-2 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 font-mono text-xs">
            {dashboard.logs.length === 0 ? (
              <p className="text-[var(--muted)]">Belum ada log provider worker.</p>
            ) : (
              dashboard.logs.map((log) => (
                <div key={log.id} className="grid gap-1 border-b border-white/5 pb-2 last:border-0">
                  <p className={log.level === "error" ? "text-red-200" : "text-emerald-100"}>
                    {formatTime(log.createdAt)} {log.level} {log.workerId ?? "admin"} {log.message}
                  </p>
                  {Object.keys(log.meta).length > 0 ? (
                    <p className="break-all text-[var(--muted)]">
                      {JSON.stringify(log.meta)}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldShell({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm text-white">
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </span>
      {children}
      <span className="block text-xs leading-5 text-[var(--muted)]">{help}</span>
    </label>
  );
}

function ParameterField({
  param,
  value,
  onChange,
}: {
  param: CatalogParamDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  if (param.type === "select") {
    return (
      <FieldShell label={param.label} help={param.help}>
        <select
          className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {(param.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  return (
    <FieldShell label={param.label} help={param.help}>
      <input
        className="h-11 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none"
        min={param.min}
        max={param.max}
        type={param.type === "number" ? "number" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="break-all text-white">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg text-white">{value}</p>
    </div>
  );
}
