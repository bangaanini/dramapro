"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LoaderCircle, Search, Sparkles, X } from "lucide-react";

import { DramaCard } from "@/components/drama-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatProviderName } from "@/lib/utils";

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

type SearchShortcut = {
  value: string;
  count: number;
};

type SearchPanelProps = {
  providers: SearchShortcut[];
  tags: SearchShortcut[];
};

const DEFAULT_EMPTY_RESPONSE: SearchResponse = {
  results: [],
  total: 0,
  minimumQueryLength: 3,
};

export function SearchPanel({ providers, tags }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse>(DEFAULT_EMPTY_RESPONSE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim());
  const canSearch =
    deferredQuery.length >= DEFAULT_EMPTY_RESPONSE.minimumQueryLength ||
    Boolean(selectedProvider) ||
    Boolean(selectedTag);

  const activeFilterCount = useMemo(
    () => [selectedProvider, selectedTag].filter(Boolean).length,
    [selectedProvider, selectedTag],
  );

  useEffect(() => {
    if (!canSearch) {
      setResults(DEFAULT_EMPTY_RESPONSE);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const searchParams = new URLSearchParams();

    if (deferredQuery.length >= DEFAULT_EMPTY_RESPONSE.minimumQueryLength) {
      searchParams.set("q", deferredQuery);
    }

    if (selectedProvider) {
      searchParams.set("provider", selectedProvider);
    }

    if (selectedTag) {
      searchParams.set("tag", selectedTag);
    }

    searchParams.set("limit", "18");
    setIsLoading(true);
    setError(null);

    async function runSearch() {
      try {
        const response = await fetch(`/api/search?${searchParams.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as SearchResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Pencarian gagal dijalankan.");
        }

        startTransition(() => {
          setResults({
            results: payload.results,
            total: payload.total,
            minimumQueryLength: payload.minimumQueryLength,
          });
        });
      } catch (searchError) {
        if (controller.signal.aborted) {
          return;
        }

        setResults(DEFAULT_EMPTY_RESPONSE);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Pencarian gagal dijalankan.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void runSearch();

    return () => controller.abort();
  }, [canSearch, deferredQuery, selectedProvider, selectedTag]);

  function toggleProvider(provider: string) {
    startTransition(() => {
      setSelectedProvider((current) => (current === provider ? null : provider));
    });
  }

  function toggleTag(tag: string) {
    startTransition(() => {
      setSelectedTag((current) => (current === tag ? null : tag));
    });
  }

  function clearFilters() {
    startTransition(() => {
      setSelectedProvider(null);
      setSelectedTag(null);
    });
  }

  return (
    <section id="search" className="mt-4 scroll-mt-24 sm:mt-5">
      <Card className="glass-panel overflow-hidden rounded-[2rem] border-white/10">
        <CardContent className="space-y-6 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Cari drama favoritmu
                </h2>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Keyword</span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3">
                <Search className="size-4 text-[var(--muted-foreground)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Contoh: CEO"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            </label>






          </div>


        </CardContent>
      </Card>
    </section>
  );
}
