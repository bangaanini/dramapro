"use client";

import { useEffect, useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";

import { DramaCard } from "@/components/drama-card";
import { Card, CardContent } from "@/components/ui/card";
import { safeSessionStorage } from "@/lib/safe-session-storage";

type FavoriteEntry = {
  id: string;
  createdAt: string;
  drama: {
    id: string;
    title: string;
    thumbUrl: string;
    providerName: string;
    episodeCount: number;
  };
};

type FavoritesResponse = {
  entries: FavoriteEntry[];
};

type FavoritesGridProps = {
  userId: string;
};

export function FavoritesGrid({ userId }: FavoritesGridProps) {
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `dramapro.me.favorites.${userId}`;
    const cachedPayload =
      safeSessionStorage.getJSON<FavoritesResponse>(cacheKey);

    if (cachedPayload) {
      setEntries(cachedPayload.entries);
      setIsLoading(false);
    }

    async function loadFavorites() {
      try {
        const response = await fetch("/api/me/favorites", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal memuat daftar favorit.");
        }

        const payload = (await response.json()) as FavoritesResponse;

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
              : "Gagal memuat daftar favorit.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFavorites();

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
            <h2 className="text-xl font-semibold text-white">Memuat favorit</h2>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Daftar drama favoritmu sedang disiapkan.
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
            <Heart className="size-7 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Favorit belum bisa dimuat
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
            <Heart className="size-7 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Belum ada drama favorit
            </h2>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Tekan tombol favorit di halaman watch untuk menyimpan judul ke
              daftar ini.
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
          href={`/watch/${entry.drama.id}`}
          title={entry.drama.title}
          thumbUrl={entry.drama.thumbUrl}
          providerName={entry.drama.providerName}
          episodeCount={entry.drama.episodeCount}
          compact
          hideCta
          cornerLabel="Koleksi"
          extraMeta={new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
          }).format(new Date(entry.createdAt))}
        />
      ))}
    </div>
  );
}
