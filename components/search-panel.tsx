"use client";

import {
  type FormEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { Film, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { DramaCard } from "@/components/drama-card";
import { triggerSelectionHaptic } from "@/lib/haptics";

type SearchResult = {
  id: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
  tags: string[];
  description: string;
  playCount: string;
};

type SearchResponse = {
  results: SearchResult[];
  total: number;
  minimumQueryLength: number;
};

const DEFAULT_EMPTY_RESPONSE: SearchResponse = {
  results: [],
  total: 0,
  minimumQueryLength: 2,
};

const POPULAR_SEARCHES = ["Romantis", "Aksi", "Komedi", "Misteri", "Fantasi"];

function buildSearchPath(query: string) {
  const trimmedQuery = query.trim();

  return trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : "/search";
}

export function SearchPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<SearchResponse>(DEFAULT_EMPTY_RESPONSE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim());
  const canSearch =
    deferredQuery.length >= DEFAULT_EMPTY_RESPONSE.minimumQueryLength;

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

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

    searchParams.set("limit", "24");
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
          setResults(payload);
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
  }, [canSearch, deferredQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    triggerSelectionHaptic();
    router.push(buildSearchPath(query), { scroll: false });
  }

  function clearQuery() {
    triggerSelectionHaptic();
    setQuery("");
    router.replace("/search", { scroll: false });
  }

  function applyPopularSearch(value: string) {
    triggerSelectionHaptic();
    setQuery(value);
    router.replace(buildSearchPath(value), { scroll: false });
  }

  return (
    <section
      id="search"
      className="relative z-10 mx-auto min-h-[calc(100dvh-5rem)] w-full max-w-[1580px] scroll-mt-24 px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-10"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Cari Serial
        </h1>
        <p className="mt-4 text-sm font-medium text-white/42">
          Jelajahi koleksi drama premium pilihan kami
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 flex h-14 max-w-[620px] items-center gap-3 rounded-[1.05rem] border border-accent/50 bg-[#070b1d]/92 px-4 shadow-[0_0_0_3px_rgba(255,55,55,0.1),0_22px_70px_rgba(255,43,43,0.14)] transition focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(255,55,55,0.16),0_24px_74px_rgba(255,43,43,0.2)] sm:h-16 sm:px-5"
          role="search"
        >
          <Search className="size-5 shrink-0 text-accent" />
          <label htmlFor="search-page-input" className="sr-only">
            Cari serial
          </label>
          <input
            id="search-page-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari berdasarkan judul, genre, atau deskripsi..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/38 sm:text-base"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={clearQuery}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/42 transition hover:bg-white/8 hover:text-white"
              aria-label="Hapus pencarian"
            >
              <X className="size-4.5" />
            </button>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-accent px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(255,56,56,0.28)] transition hover:brightness-110 active:scale-[0.98] sm:h-11 sm:px-6"
          >
            Cari
          </button>
        </form>

        <p className="mt-3 text-xs font-medium text-white/34">
          Ketik minimal {DEFAULT_EMPTY_RESPONSE.minimumQueryLength} karakter untuk mencari
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-[960px]">
        {canSearch ? (
          <p className="mb-4 text-sm font-semibold text-white/58">
            <span className="text-accent">{results.total}</span> hasil untuk{" "}
            <span className="text-white">&quot;{deferredQuery}&quot;</span>
          </p>
        ) : null}

        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/56">
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3">
            <SlidersHorizontal className="size-3.5" />
            Urutkan
          </span>
          <span className="inline-flex h-8 items-center rounded-full bg-accent px-3 font-semibold text-white">
            Relevansi
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-white/8 bg-white/[0.04] px-3 font-semibold text-white/70">
            Terbaru
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-white/8 bg-white/[0.04] px-3 font-semibold text-white/70">
            Populer
          </span>
        </div>

        {!canSearch ? (
          <div className="flex min-h-[22rem] flex-col items-center justify-center text-center">
            <div className="relative">
              <div className="absolute -inset-5 rounded-full bg-accent/10 blur-2xl" />
              <div className="relative flex size-24 items-center justify-center rounded-full border border-white/8 bg-white/[0.045] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
                <div className="flex size-16 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/14">
                  <Film className="size-8" />
                </div>
              </div>
            </div>
            <h2 className="mt-7 text-lg font-semibold text-white">
              Siap Menjelajah?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/42">
              Mulai ketik untuk menemukan ribuan drama premium dari China,
              Amerika, dan seluruh dunia.
            </p>
            <p className="mt-6 text-xs font-medium text-white/34">
              Pencarian populer
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => applyPopularSearch(item)}
                  className="inline-flex h-8 items-center rounded-full border border-white/8 bg-white/[0.05] px-3 text-xs font-semibold text-white/72 transition hover:border-accent/35 hover:bg-accent/12 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-[20rem] items-center justify-center gap-3 text-sm font-semibold text-white/70">
            <LoaderCircle className="size-5 animate-spin text-accent" />
            Menjalankan pencarian...
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
            {error}
          </div>
        ) : results.results.length === 0 ? (
          <div className="flex min-h-[20rem] flex-col items-center justify-center gap-2 text-center">
            <p className="font-semibold text-white">Belum ada hasil cocok</p>
            <p className="text-sm text-white/42">
              Coba gunakan kata kunci lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-6 lg:gap-y-8">
            {results.results.map((drama) => (
              <DramaCard
                key={drama.id}
                href={`/watch/${drama.id}`}
                title={drama.title}
                thumbUrl={drama.thumbUrl}
                providerName={drama.providerName}
                episodeCount={drama.episodeCount}
                extraMeta={null}
                hideCta
                compact
                hideCompactMeta
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
