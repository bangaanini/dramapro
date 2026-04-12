"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { LoaderCircle, Search, Sparkles } from "lucide-react";

import { DramaCard } from "@/components/drama-card";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent } from "@/components/ui/card";
import { formatProviderName } from "@/lib/utils";

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

const DEFAULT_EMPTY_RESPONSE: SearchResponse = {
  results: [],
  total: 0,
  minimumQueryLength: 3,
};

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [selectedProvider] = useState<string | null>(null);
  const [selectedTag] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse>(DEFAULT_EMPTY_RESPONSE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim());
  const canSearch =
    deferredQuery.length >= DEFAULT_EMPTY_RESPONSE.minimumQueryLength ||
    Boolean(selectedProvider) ||
    Boolean(selectedTag);

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

          <div className="rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
            {!canSearch ? (
              <div className="flex min-h-36 flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full border border-white/10 bg-white/5 p-3">
                  <Sparkles className="size-6 text-accent" />
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex min-h-36 items-center justify-center gap-3 text-sm text-white">
                <LoaderCircle className="size-4 animate-spin text-accent" />
                Menjalankan pencarian...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : results.results.length === 0 ? (
              <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-center">
                <p className="font-medium text-white">Belum ada hasil cocok</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedProvider ? (
                      <Badge className="border-white/10 bg-black/35 text-white">
                        Provider: {formatProviderName(selectedProvider)}
                      </Badge>
                    ) : null}
                    {selectedTag ? (
                      <Badge className="border-white/10 bg-black/35 text-white">
                        Tag: #{selectedTag}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                  {results.results.map((drama) => (
                    <DramaCard
                      key={drama.id}
                      href={`/watch/${drama.id}`}
                      title={drama.title}
                      thumbUrl={drama.thumbUrl}
                      providerName={drama.providerName}
                      episodeCount={drama.episodeCount}
                      extraMeta={
                        drama.tags.length > 0
                          ? drama.tags.slice(0, 2).join(" • ")
                          : null
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>




          </div>


        </CardContent>
      </Card>
    </section>
  );
}
