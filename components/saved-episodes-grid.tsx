"use client";

import { useEffect, useState } from "react";
import { Bookmark, LoaderCircle } from "lucide-react";

import { DramaCard } from "@/components/drama-card";
import { Card, CardContent } from "@/components/ui/card";
import { safeSessionStorage } from "@/lib/safe-session-storage";

type SavedEpisodeEntry = {
  id: string;
  updatedAt: string;
  savedCount: number;
  lastEpisodeIndex: number;
  drama: {
    id: string;
    title: string;
    thumbUrl: string;
    providerName: string;
    episodeCount: number;
  };
};

type SavedEpisodesResponse = {
  entries: SavedEpisodeEntry[];
};

type SavedEpisodesGridProps = {
  userId: string;
};

export function SavedEpisodesGrid({ userId }: SavedEpisodesGridProps) {
  const [entries, setEntries] = useState<SavedEpisodeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `dramapro.me.saved-episodes.${userId}`;
    const cachedPayload =
      safeSessionStorage.getJSON<SavedEpisodesResponse>(cacheKey);

    if (cachedPayload) {
      setEntries(cachedPayload.entries);
      setIsLoading(false);
    }

    async function loadSavedEpisodes() {
      try {
        const response = await fetch("/api/me/saved-episodes", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal memuat episode tersimpan.");
        }

        const payload = (await response.json()) as SavedEpisodesResponse;

        if (!isMounted) {
          return;
        }

        setEntries(payload.entries);
        safeSessionStorage.setJSON(cacheKey, payload);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (!cachedPayload) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat episode tersimpan.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSavedEpisodes();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="glass-panel rounded-[1.8rem]">
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="rounded-full border border-white/10 bg-white/5 p-4">
            <LoaderCircle className="size-7 animate-spin text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Memuat episode tersimpan
            </h2>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Episode yang kamu simpan sedang disiapkan.
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
            <Bookmark className="size-7 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Episode tersimpan belum bisa dimuat
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
            <Bookmark className="size-7 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Belum ada episode tersimpan
            </h2>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Gunakan tombol simpan di player untuk menaruh episode favoritmu di
              tab ini.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5 pb-6 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {entries.map((entry) => (
        <DramaCard
          key={entry.id}
          href={`/watch/${entry.drama.id}/play?episode=${entry.lastEpisodeIndex}`}
          title={entry.drama.title}
          thumbUrl={entry.drama.thumbUrl}
          providerName={entry.drama.providerName}
          episodeCount={entry.drama.episodeCount}
          compact
          hideCta
          cornerLabel="Tersimpan"
          extraMeta={`${entry.savedCount} episode tersimpan`}
        />
      ))}
    </div>
  );
}
