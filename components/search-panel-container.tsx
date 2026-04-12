"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { SearchPanel } from "@/components/search-panel";
import { Card, CardContent } from "@/components/ui/card";
import { safeSessionStorage } from "@/lib/safe-session-storage";

type SearchShortcut = {
  value: string;
  count: number;
};

type SearchShortcutsResponse = {
  providers: SearchShortcut[];
  tags: SearchShortcut[];
};

type SearchPanelContainerProps = {
  initialProviders?: SearchShortcut[];
  initialTags?: SearchShortcut[];
};

const EMPTY_SHORTCUTS: SearchShortcutsResponse = {
  providers: [],
  tags: [],
};
const SEARCH_SHORTCUTS_CACHE_KEY = "dramapro.search-shortcuts.v2";

export function SearchPanelContainer({
  initialProviders = [],
  initialTags = [],
}: SearchPanelContainerProps) {
  const [shortcuts, setShortcuts] = useState<SearchShortcutsResponse>({
    providers: initialProviders,
    tags: initialTags,
  });
  const [isLoading, setIsLoading] = useState(
    initialProviders.length === 0 && initialTags.length === 0,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProviders.length > 0 || initialTags.length > 0) {
      return;
    }

    let isMounted = true;
    const cachedShortcuts =
      safeSessionStorage.getJSON<SearchShortcutsResponse>(
        SEARCH_SHORTCUTS_CACHE_KEY,
      );

    if (cachedShortcuts) {
      setShortcuts(cachedShortcuts);
      setIsLoading(false);
    }

    async function loadShortcuts() {
      try {
        const response = await fetch("/api/catalog/shortcuts", {
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error("Gagal memuat shortcut pencarian.");
        }

        const payload = (await response.json()) as SearchShortcutsResponse;

        if (!isMounted) {
          return;
        }

        setShortcuts(payload);
        safeSessionStorage.setJSON(SEARCH_SHORTCUTS_CACHE_KEY, payload);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (!cachedShortcuts) {
          setShortcuts(EMPTY_SHORTCUTS);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat shortcut pencarian.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadShortcuts();

    return () => {
      isMounted = false;
    };
  }, [initialProviders.length, initialTags.length]);

  if (isLoading) {
    return (
      <section className="mt-4 sm:mt-5">
        <Card className="glass-panel overflow-hidden rounded-[2rem] border-white/10">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center sm:p-7">
            <div className="rounded-full border border-white/10 bg-white/5 p-3">
              <LoaderCircle className="size-6 animate-spin text-accent" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-white">Menyiapkan panel pencarian</p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <>
      <SearchPanel providers={shortcuts.providers} tags={shortcuts.tags} />
      {error ? (
        <div className="mt-4 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <div>
              <p className="font-medium">Shortcut pencarian belum lengkap</p>
              <p className="mt-1 text-amber-50/85">
                {error} Kamu masih bisa mencari manual lewat keyword.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
