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

type SyncResult = {
  provider: string;
  source: string;
  page: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ providerDramaId: string | null; message: string }>;
};

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
    setResults([]);

    try {
      const pageNumber = Number.parseInt(page, 10);

      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new Error("Page harus berupa angka mulai dari 1.");
      }

      const nextResults: SyncResult[] = [];

      for (const currentProvider of providersToRun) {
        const response = await fetch(
          `/api/cron/sync?provider=${encodeURIComponent(currentProvider)}&page=${pageNumber}&source=${encodeURIComponent(source)}`,
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              `Sync ${currentProvider} gagal dengan status ${response.status}.`,
          );
        }

        nextResults.push(payload as SyncResult);
      }

      setResults(nextResults);
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
                Beberapa provider belum mendukung <span className="font-medium text-white">popular</span>,
                jadi endpoint itu bisa mengembalikan error upstream.
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
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-4">
                    <div>Processed: <span className="text-white">{result.processed}</span></div>
                    <div>Created: <span className="text-white">{result.created}</span></div>
                    <div>Updated: <span className="text-white">{result.updated}</span></div>
                    <div>Skipped: <span className="text-white">{result.skipped}</span></div>
                  </div>
                  {result.errors.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-yellow-300/15 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
                      {result.errors[0].message}
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
