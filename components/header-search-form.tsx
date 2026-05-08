"use client";

import Link from "next/link";
import {
  type FocusEvent,
  type FormEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowRight, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type HeaderSearchResult = {
  id: string;
  title: string;
  thumbUrl: string;
  providerName: string;
  episodeCount: number;
  tags: string[];
  description: string;
  playCount: string;
};

type HeaderSearchResponse = {
  results: HeaderSearchResult[];
  total: number;
  minimumQueryLength: number;
};

const DEFAULT_RESPONSE: HeaderSearchResponse = {
  results: [],
  total: 0,
  minimumQueryLength: 2,
};

function buildSearchHref(query: string) {
  const trimmedQuery = query.trim();

  return trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : "/search";
}

function clampDescription(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= 86) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, 86).trim()}...`;
}

export function HeaderSearchForm() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<HeaderSearchResponse>(DEFAULT_RESPONSE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const canSearch = deferredQuery.length >= DEFAULT_RESPONSE.minimumQueryLength;
  const searchHref = useMemo(() => buildSearchHref(query), [query]);

  useEffect(() => {
    if (!canSearch) {
      setResults(DEFAULT_RESPONSE);
      setError("");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: deferredQuery,
      limit: "4",
    });

    setIsLoading(true);
    setError("");

    async function runLiveSearch() {
      try {
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as HeaderSearchResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Pencarian belum bisa dijalankan.");
        }

        setResults(payload);
      } catch (searchError) {
        if (controller.signal.aborted) {
          return;
        }

        setResults(DEFAULT_RESPONSE);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Pencarian belum bisa dijalankan.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void runLiveSearch();

    return () => controller.abort();
  }, [canSearch, deferredQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    triggerSelectionHaptic();
    router.push(searchHref, { scroll: false });
    setIsOpen(false);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocus = event.relatedTarget;

    if (nextFocus && rootRef.current?.contains(nextFocus)) {
      return;
    }

    setIsOpen(false);
  }

  function clearQuery() {
    triggerSelectionHaptic();
    setQuery("");
    setResults(DEFAULT_RESPONSE);
    setError("");
    setIsOpen(true);
  }

  return (
    <div
      ref={rootRef}
      onBlur={handleBlur}
      className="relative hidden w-[min(36vw,420px)] min-w-[280px] lg:block"
    >
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex h-12 items-center gap-3 rounded-full border bg-white/[0.055] px-5 text-sm font-medium text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition",
          isOpen
            ? "border-accent/55 bg-white/[0.08] shadow-[0_18px_52px_rgba(255,58,58,0.12)]"
            : "border-white/18 hover:border-white/28",
        )}
        role="search"
      >
        <Search className="size-4.5 shrink-0 text-white/46" />
        <label className="sr-only" htmlFor="header-search">
          Cari drama
        </label>
        <input
          id="header-search"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          placeholder="Cari serial berdasarkan judul atau deskripsi..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/48"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Hapus pencarian"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white/42 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="submit"
          aria-label="Cari drama"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_rgba(255,60,57,0.28)] transition hover:brightness-110 active:scale-[0.96]"
        >
          <Search className="size-4.5" />
        </button>
      </form>

      {isOpen ? (
        <div className="absolute right-0 top-full z-[70] mt-3 w-[min(88vw,430px)] overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#090d20]/98 text-white shadow-[0_28px_80px_rgba(0,0,0,0.58)] backdrop-blur-2xl">
          <div className="border-b border-white/7 px-4 py-3">
            <p className="text-xs font-semibold text-white/45">
              {canSearch
                ? `Hasil untuk "${deferredQuery}"`
                : `Ketik minimal ${DEFAULT_RESPONSE.minimumQueryLength} karakter untuk mencari`}
            </p>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {!canSearch ? (
              <div className="flex min-h-28 flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full border border-white/8 bg-white/[0.035] p-3">
                  <Search className="size-5 text-white/30" />
                </div>
                <p className="max-w-[260px] text-xs leading-5 text-white/38">
                  Ketik judul, genre, atau deskripsi serial yang ingin kamu cari.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex min-h-28 items-center justify-center gap-2 text-xs font-semibold text-white/60">
                <LoaderCircle className="size-4 animate-spin text-accent" />
                Mencari serial...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-400/18 bg-red-500/10 px-3 py-3 text-xs leading-5 text-red-100">
                {error}
              </div>
            ) : results.results.length === 0 ? (
              <div className="flex min-h-28 items-center justify-center text-center text-xs font-medium text-white/42">
                Belum ada serial yang cocok.
              </div>
            ) : (
              <div className="space-y-1.5">
                {results.results.slice(0, 4).map((result) => (
                  <Link
                    key={result.id}
                    href={`/watch/${result.id}`}
                    prefetch
                    onClick={() => setIsOpen(false)}
                    onPointerDown={() => triggerSelectionHaptic()}
                    className="group flex gap-3 rounded-xl border border-transparent p-2.5 transition hover:border-accent/28 hover:bg-accent/14 focus-visible:border-accent/45 focus-visible:bg-accent/18 focus-visible:outline-none"
                  >
                    <span className="relative h-[64px] w-[46px] shrink-0 overflow-hidden rounded-lg bg-white/[0.05] ring-1 ring-white/8">
                      {result.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.thumbUrl}
                          alt={result.title}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <Search className="size-4 text-white/28" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="line-clamp-1 text-sm font-semibold text-white transition group-hover:text-white">
                        {result.title}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-5 text-white/42">
                        {clampDescription(result.description || result.providerName)}
                      </span>
                      <span className="mt-1.5 inline-flex items-center gap-2 text-[11px] font-semibold text-white/38">
                        <span>{result.providerName}</span>
                        <span className="size-1 rounded-full bg-white/20" />
                        <span>{result.episodeCount} episode</span>
                      </span>
                    </span>
                    <ArrowRight className="mt-5 size-4 shrink-0 text-white/24 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href={searchHref}
            prefetch
            onClick={() => setIsOpen(false)}
            onPointerDown={() => triggerSelectionHaptic()}
            className="flex h-12 items-center justify-center gap-2 border-t border-white/7 bg-white/[0.025] text-sm font-semibold text-accent transition hover:bg-accent/12 hover:text-red-200"
          >
            Jelajahi semua serial
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
