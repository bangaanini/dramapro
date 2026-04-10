"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CirclePlay,
  LoaderCircle,
  RefreshCcw,
  ServerCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PROVIDERS, SYNC_SOURCES, type ProviderType, type SyncSource } from "@/lib/provider-adapter";

type SyncApiResult = {
  provider: string;
  source: string;
  page: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ providerDramaId: string | null; message: string }>;
};

type SyncResult = SyncApiResult & {
  ok: boolean;
  status: number;
  detail?: string;
};

async function readResponsePayload(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      error: `Server mengembalikan response non-JSON (status ${response.status}).`,
      raw: text.slice(0, 200),
    };
  }
}

const providerOptions = ["all", ...PROVIDERS] as const;

type AdminSyncPanelProps = {
  adminName: string;
  adminEmail: string;
};

export function AdminSyncPanel({
  adminName,
  adminEmail,
}: AdminSyncPanelProps) {
  const [provider, setProvider] = useState<(typeof providerOptions)[number]>("all");
  const [source, setSource] = useState<SyncSource>("home");
  const [page, setPage] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const providersToRun = useMemo(
    () =>
      provider === "all"
        ? [...PROVIDERS]
        : [provider as ProviderType],
    [provider],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSummary(null);
    setResults([]);

    try {
      const pageNumber = Number.parseInt(page, 10);

      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new Error("Page harus berupa angka mulai dari 1.");
      }

      const nextResults: SyncResult[] = [];

      for (const currentProvider of providersToRun) {
        try {
          const response = await fetch(
            `/api/cron/sync?provider=${encodeURIComponent(currentProvider)}&page=${pageNumber}&source=${encodeURIComponent(source)}`,
          );

          const payload = await readResponsePayload(response);

          if (!response.ok) {
            const detail =
              (typeof payload === "object" &&
              payload &&
              "detail" in payload &&
              typeof payload.detail === "string"
                ? payload.detail
                : null) ||
              (typeof payload === "object" &&
              payload &&
              "error" in payload &&
              typeof payload.error === "string"
                ? payload.error
                : null) ||
              (!payload
                ? `Server mengembalikan body kosong dengan status ${response.status}.`
                : `Server mengembalikan status ${response.status}.`);

            nextResults.push({
              provider: currentProvider,
              source,
              page: pageNumber,
              processed: 0,
              created: 0,
              updated: 0,
              skipped: 0,
              errors: [],
              ok: false,
              status: response.status,
              detail,
            });
            continue;
          }

          if (!payload || typeof payload !== "object") {
            nextResults.push({
              provider: currentProvider,
              source,
              page: pageNumber,
              processed: 0,
              created: 0,
              updated: 0,
              skipped: 0,
              errors: [],
              ok: false,
              status: response.status,
              detail: "Response sukses tetapi body tidak valid.",
            });
            continue;
          }

          const result = payload as SyncApiResult;
          nextResults.push({
            ...result,
            ok: true,
            status: response.status,
          });
        } catch (providerError) {
          nextResults.push({
            provider: currentProvider,
            source,
            page: pageNumber,
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            ok: false,
            status: 0,
            detail:
              providerError instanceof Error
                ? providerError.message
                : "Terjadi error saat memanggil endpoint sync.",
          });
        }
      }

      setResults(nextResults);
      const failedCount = nextResults.filter((result) => !result.ok).length;
      const successCount = nextResults.length - failedCount;

      setSummary(
        failedCount > 0
          ? `Sync selesai. ${successCount} provider berhasil, ${failedCount} provider gagal. Provider yang gagal tidak menghentikan provider lain.`
          : `Sync selesai. ${successCount} provider berhasil diproses.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Sync gagal dijalankan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel rounded-[2rem]">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <Badge className="border-accent/30 bg-accent-soft text-accent">
              <ServerCog className="mr-2 size-3.5" />
              Manual metadata sync
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Admin Sync Panel
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Gunakan panel ini untuk trigger sync metadata secara manual ke feed
                <span className="font-medium text-white"> home</span>,
                <span className="font-medium text-white"> new</span>, atau
                <span className="font-medium text-white"> popular</span>.
                Di upstream, feed ini memang memakai slug
                <span className="font-medium text-white"> populer</span>, dan
                adapter akan memetakan otomatis dari source internal
                <span className="font-medium text-white"> popular</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{adminName}</Badge>
                <Badge variant="outline">{adminEmail}</Badge>
              </div>
            </div>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="text-sm font-medium text-white">Provider</span>
              <select
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as (typeof providerOptions)[number])
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
              >
                {providerOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#1a1110]">
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-white">Source</span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as SyncSource)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
              >
                {SYNC_SOURCES.map((option) => (
                  <option key={option} value={option} className="bg-[#1a1110]">
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-white">Page</span>
              <input
                type="number"
                min="1"
                value={page}
                onChange={(event) => setPage(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>

            <div className="flex items-end">
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Menjalankan sync...
                  </>
                ) : (
                  <>
                    <CirclePlay className="mr-2 size-4" />
                    Jalankan Sync
                  </>
                )}
              </Button>
            </div>
          </form>

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {summary ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--muted)]">
              {summary}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-panel rounded-[2rem]">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-white">
            <RefreshCcw className="size-4 text-accent" />
            <h2 className="text-lg font-semibold">Hasil sync terbaru</h2>
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada eksekusi di sesi ini.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={`${result.provider}-${result.source}-${result.page}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{result.provider}</Badge>
                    <Badge variant="outline">{result.source}</Badge>
                    <Badge variant="outline">page {result.page}</Badge>
                    <Badge
                      className={
                        result.ok
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                          : "border-red-400/20 bg-red-500/10 text-red-100"
                      }
                    >
                      {result.ok ? "success" : "failed"}
                    </Badge>
                    <Badge variant="outline">
                      {result.status > 0 ? `status ${result.status}` : "request error"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-4">
                    <div>Processed: <span className="text-white">{result.processed}</span></div>
                    <div>Created: <span className="text-white">{result.created}</span></div>
                    <div>Updated: <span className="text-white">{result.updated}</span></div>
                    <div>Skipped: <span className="text-white">{result.skipped}</span></div>
                  </div>
                  {result.detail ? (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                      {result.detail}
                    </div>
                  ) : null}
                  {result.errors.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-yellow-300/15 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
                      {result.errors.length === 1
                        ? result.errors[0].message
                        : `${result.errors.length} item mengalami issue. Contoh: ${result.errors[0].message}`}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
