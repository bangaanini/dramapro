"use client";

import { Crown, Play, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SearchParamReader = {
  get(name: string): string | null;
  toString(): string;
};

function getPremiumEpisodeValue(searchParams: SearchParamReader) {
  const rawValue = searchParams.get("premiumEpisode");
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return null;
  }

  return Math.floor(numericValue);
}

function cleanPremiumEpisodeParams(params: URLSearchParams) {
  params.delete("premiumEpisode");
  params.delete("premiumTitle");
  params.delete("premiumNext");
}

function getCleanedCurrentPath(pathname: string | null, searchParams: SearchParamReader) {
  const params = new URLSearchParams(searchParams.toString());
  cleanPremiumEpisodeParams(params);

  const query = params.toString();
  return query ? `${pathname || "/"}?${query}` : pathname || "/";
}

export function PremiumEpisodeModal() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const episode = getPremiumEpisodeValue(searchParams);
  const title = searchParams.get("premiumTitle")?.trim() || "serial ini";
  const next =
    searchParams.get("premiumNext")?.trim() ||
    getCleanedCurrentPath(pathname, searchParams);

  if (!episode) {
    return null;
  }

  function closeModal() {
    const params = new URLSearchParams(window.location.search);
    cleanPremiumEpisodeParams(params);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname || "/", {
      scroll: false,
    });
  }

  function openPremiumModal() {
    const params = new URLSearchParams(window.location.search);
    cleanPremiumEpisodeParams(params);
    params.set("premium", "1");
    params.set("next", next);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  return (
    <div className="fixed inset-0 z-[117] flex items-center justify-center overflow-y-auto bg-black/78 px-5 py-6 backdrop-blur-xl">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup episode premium"
        onClick={closeModal}
      />
      <section className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#05040d]/96 px-5 pb-7 pt-16 text-center text-white shadow-[0_30px_100px_rgba(0,0,0,0.64)] backdrop-blur-2xl sm:rounded-[1.85rem] sm:px-8 sm:pb-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,118,42,0.2),transparent_27%),radial-gradient(circle_at_50%_46%,rgba(255,0,82,0.16),transparent_30%)]" />
        <div className="absolute inset-x-0 top-24 h-56 bg-[radial-gradient(ellipse_at_center,rgba(255,68,31,0.14),transparent_66%)]" />
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.025] text-white/46 transition hover:bg-white/8 hover:text-white"
          aria-label="Tutup"
        >
          <X className="size-5" />
        </button>

        <div className="relative">
          <div className="mx-auto flex size-[5.3rem] rotate-45 items-center justify-center rounded-[1.45rem] bg-[linear-gradient(135deg,#ef0064,#ff7a1c)] shadow-[0_22px_70px_rgba(255,40,70,0.38)]">
            <div className="-rotate-45">
              <Play className="ml-1 size-11 fill-black/78 text-black/78" />
            </div>
          </div>

          <h2 className="mt-8 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Unlock Premium
          </h2>
          <p className="mx-auto mt-5 max-w-[430px] text-base font-semibold leading-7 text-white/78 sm:text-lg">
            Continue watching {title}
          </p>
          <p className="mt-3 text-sm font-semibold text-white/42 sm:text-base">
            Episode {episode} requires a subscription
          </p>

          <button
            type="button"
            onClick={openPremiumModal}
            className="mt-9 inline-flex h-14 w-full max-w-[420px] items-center justify-center rounded-[1rem] bg-[linear-gradient(90deg,#f40054,#ff7b22)] px-6 text-base font-bold text-white shadow-[0_22px_60px_rgba(255,53,47,0.34)] transition hover:brightness-110 active:scale-[0.985] sm:h-16 sm:text-lg"
          >
            <Crown className="mr-2 size-5" />
            Subscribe Now
          </button>

          <p className="mt-8 text-sm font-semibold text-white/48 sm:text-base">
            Cancel anytime • Instant access • All devices
          </p>
        </div>
      </section>
    </div>
  );
}
