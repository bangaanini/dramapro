"use client";

import Image from "next/image";
import { Crown, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import premiumLogo from "@/2.png";

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
    <div className="fixed inset-0 z-[117] flex items-start justify-center overflow-hidden bg-black/78 px-3 pb-[calc(0.8rem_+_env(safe-area-inset-bottom))] pt-[calc(4.75rem_+_env(safe-area-inset-top))] backdrop-blur-xl sm:items-center sm:px-6 sm:py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup episode premium"
        onClick={closeModal}
      />
      <section className="relative z-10 flex max-h-[calc(100dvh_-_5.75rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-[560px] flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#05040d]/96 text-center text-white shadow-[0_30px_100px_rgba(0,0,0,0.64)] backdrop-blur-2xl sm:max-h-[calc(100dvh_-_3rem)] sm:rounded-[1.85rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,118,42,0.2),transparent_27%),radial-gradient(circle_at_50%_46%,rgba(255,0,82,0.16),transparent_30%)]" />
        <div className="absolute inset-x-0 top-24 h-56 bg-[radial-gradient(ellipse_at_center,rgba(255,68,31,0.14),transparent_66%)]" />
        <div className="relative z-20 flex shrink-0 justify-end px-3 pb-1 pt-3">
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#0b1024]/92 text-white/78 shadow-[0_12px_34px_rgba(0,0,0,0.42)] transition hover:bg-white/10 hover:text-white"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-8">
          <div className="mx-auto flex size-[5.8rem] items-center justify-center overflow-hidden rounded-[1.55rem] bg-white/[0.035] p-1 shadow-[0_22px_70px_rgba(255,40,70,0.28)] ring-1 ring-white/10">
            <Image
              src={premiumLogo}
              alt="Layar Drama"
              priority
              className="h-full w-full object-contain"
              sizes="96px"
            />
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
