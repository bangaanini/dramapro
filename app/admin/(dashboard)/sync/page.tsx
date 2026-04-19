import { RefreshCcw } from "lucide-react";

import { FeedSource, ProviderName } from "@/app/generated/prisma/client";
import { AdminSyncPanel } from "@/components/admin-sync-panel";
import { Badge } from "@/components/ui/badge";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_PROVIDERS } from "@/lib/provider-adapter";

export const dynamic = "force-dynamic";

const SOURCE_ORDER: FeedSource[] = ["home", "new", "popular"];

const SOURCE_LABELS: Record<FeedSource, string> = {
  home: "Home",
  new: "New",
  popular: "Populer",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function AdminSyncPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return null;
  }

  const activeProviders = [...ACTIVE_PROVIDERS] as ProviderName[];

  const [totalDatabaseDramas, activeProviderDramaStats, feedEntries] =
    await Promise.all([
      prisma.drama.count(),
      prisma.drama.findMany({
        where: {
          providerName: {
            in: activeProviders,
          },
        },
        select: {
          providerName: true,
          isStreamPlayable: true,
        },
      }),
      prisma.dramaFeed.findMany({
        where: {
          drama: {
            providerName: {
              in: activeProviders,
            },
          },
        },
        select: {
          source: true,
          drama: {
            select: {
              providerName: true,
              isStreamPlayable: true,
            },
          },
        },
      }),
    ]);

  const summary = {
    activeProviderDramaCount: activeProviderDramaStats.length,
    activePlayableDramaCount: activeProviderDramaStats.filter(
      (drama) => drama.isStreamPlayable,
    ).length,
  };

  const feedStats = new Map<
    `${FeedSource}:${ProviderName}`,
    {
      source: FeedSource;
      provider: ProviderName;
      total: number;
      playable: number;
      notPlayable: number;
    }
  >();

  const sourceTotals = new Map<
    FeedSource,
    {
      total: number;
      playable: number;
      notPlayable: number;
    }
  >();

  for (const source of SOURCE_ORDER) {
    sourceTotals.set(source, { total: 0, playable: 0, notPlayable: 0 });

    for (const provider of activeProviders) {
      feedStats.set(`${source}:${provider}`, {
        source,
        provider,
        total: 0,
        playable: 0,
        notPlayable: 0,
      });
    }
  }

  for (const entry of feedEntries) {
    const key = `${entry.source}:${entry.drama.providerName}` as const;
    const stats = feedStats.get(key);
    const sourceSummary = sourceTotals.get(entry.source);

    if (!stats || !sourceSummary) {
      continue;
    }

    stats.total += 1;
    sourceSummary.total += 1;

    if (entry.drama.isStreamPlayable) {
      stats.playable += 1;
      sourceSummary.playable += 1;
    } else {
      stats.notPlayable += 1;
      sourceSummary.notPlayable += 1;
    }
  }

  const feedRows = SOURCE_ORDER.flatMap((source) =>
    activeProviders.map((provider) => {
      const stats = feedStats.get(`${source}:${provider}` as const);

      return (
        stats ?? {
          source,
          provider,
          total: 0,
          playable: 0,
          notPlayable: 0,
        }
      );
    }),
  );

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <RefreshCcw className="mr-2 size-3.5" />
          Sinkronisasi metadata
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Sync Provider
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Jalankan sinkronisasi feed provider secara manual untuk home, new, dan
          popular.
        </p>
      </div>

      <section className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-white">
            Ringkasan database
          </h2>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Statistik ini merangkum total drama yang tersimpan dan status
            playable feed `home`, `new`, dan `populer` untuk provider aktif.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Semua drama DB
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {formatNumber(totalDatabaseDramas)}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Provider aktif
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {formatNumber(summary.activeProviderDramaCount)}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Playable aktif
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {formatNumber(summary.activePlayableDramaCount)}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Provider dipantau
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {formatNumber(activeProviders.length)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {SOURCE_ORDER.map((source) => {
            const stats = sourceTotals.get(source) ?? {
              total: 0,
              playable: 0,
              notPlayable: 0,
            };

            return (
              <div
                key={source}
                className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">
                    {SOURCE_LABELS[source]}
                  </p>
                  <Badge className="border-white/10 bg-white/5 text-white">
                    {formatNumber(stats.playable)} playable
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Total {formatNumber(stats.total)} drama,{" "}
                  {formatNumber(stats.notPlayable)} belum playable.
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/4 text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3 font-medium">Sumber</th>
                <th className="px-3 py-3 font-medium">Provider</th>
                <th className="px-3 py-3 font-medium">Total drama</th>
                <th className="px-3 py-3 font-medium">Playable</th>
                <th className="px-3 py-3 font-medium">Belum playable</th>
                <th className="px-3 py-3 font-medium">Rasio</th>
              </tr>
            </thead>
            <tbody>
              {feedRows.map((row) => {
                const ratio =
                  row.total > 0
                    ? `${Math.round((row.playable / row.total) * 100)}%`
                    : "-";

                return (
                  <tr key={`${row.source}:${row.provider}`} className="border-b border-white/6">
                    <td className="px-3 py-4 text-white">
                      {SOURCE_LABELS[row.source]}
                    </td>
                    <td className="px-3 py-4">
                      <Badge className="border-white/10 bg-white/5 text-white">
                        {row.provider}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 text-white">
                      {formatNumber(row.total)}
                    </td>
                    <td className="px-3 py-4 text-emerald-100">
                      {formatNumber(row.playable)}
                    </td>
                    <td className="px-3 py-4 text-amber-100">
                      {formatNumber(row.notPlayable)}
                    </td>
                    <td className="px-3 py-4 text-[var(--muted)]">{ratio}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <AdminSyncPanel
        adminName={admin.name}
        adminEmail={admin.email}
        activeProviders={[...ACTIVE_PROVIDERS]}
      />
    </div>
  );
}
