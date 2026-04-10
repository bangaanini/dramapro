"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatProviderName } from "@/lib/utils";

type HistoryEntry = {
  id: string;
  episodeIndex: number;
  lastPositionSeconds: number;
  updatedAt: string;
  drama: {
    id: string;
    title: string;
    providerName: string;
    tags: string[];
  };
};

type HistoryResponse = {
  entries: HistoryEntry[];
};

type HistoryListProps = {
  userId: string;
};

export function HistoryList({ userId }: HistoryListProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCachedData, setHasCachedData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `dramapro.me.history.${userId}`;

    try {
      const cachedValue = window.sessionStorage.getItem(cacheKey);

      if (cachedValue) {
        const cachedPayload = JSON.parse(cachedValue) as HistoryResponse;
        setEntries(cachedPayload.entries);
        setHasCachedData(true);
        setIsLoading(false);
      }
    } catch {
      window.sessionStorage.removeItem(cacheKey);
    }

    async function loadHistory() {
      try {
        const response = await fetch("/api/me/history", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal memuat riwayat tontonan.");
        }

        const payload = (await response.json()) as HistoryResponse;

        if (!isMounted) {
          return;
        }

        setEntries(payload.entries);
        window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (!hasCachedData) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat riwayat tontonan.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [hasCachedData, userId]);

  if (isLoading) {
    return (
      <Card className="glass-panel rounded-[1.8rem]">
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="rounded-full border border-white/10 bg-white/5 p-4">
            <LoaderCircle className="size-7 animate-spin text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Memuat riwayat</h2>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Riwayat tontonanmu sedang disiapkan.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-panel rounded-[1.8rem]">
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="rounded-full border border-white/10 bg-white/5 p-4">
            <History className="size-7 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Riwayat belum bisa dimuat
            </h2>
            <p className="max-w-md text-sm text-[var(--muted)]">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="glass-panel rounded-[1.8rem]">
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="rounded-full border border-white/10 bg-white/5 p-4">
            <History className="size-7 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Belum ada riwayat tontonan
            </h2>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Setelah kamu menonton beberapa detik, player akan otomatis
              menyimpan progres di halaman ini.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Link key={entry.id} href={`/watch/${entry.drama.id}`} className="block">
          <Card className="glass-panel rounded-[1.8rem] border-white/10 transition hover:border-accent/35">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="space-y-2">
                <p className="text-lg font-semibold text-white">{entry.drama.title}</p>
                <p className="text-sm text-[var(--muted)]">
                  EP.{entry.episodeIndex} • {Math.max(0, entry.lastPositionSeconds)}{" "}
                  detik
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {formatProviderName(entry.drama.providerName)}
                  </Badge>
                  {entry.drama.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      className="border-white/10 bg-white/6 text-white"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="shrink-0 text-xs text-[var(--muted-foreground)]">
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(entry.updatedAt))}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
