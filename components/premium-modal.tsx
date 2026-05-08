"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Film,
  LoaderCircle,
  Play,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type PremiumPlan = {
  id: string;
  name: string;
  description: string | null;
  badgeText: string;
  badgeColor: string;
  priceAmount: number;
  currency: string;
  durationDays: number;
};

type PremiumModalPayload = {
  user: {
    id?: string;
    name?: string;
    isSignedIn: boolean;
    hasActiveVip: boolean;
    vipExpiresAt: string | null;
  };
  plans: PremiumPlan[];
};

type PremiumModalState =
  | {
      status: "idle" | "loading";
      payload: null;
      error: "";
    }
  | {
      status: "ready";
      payload: PremiumModalPayload;
      error: "";
    }
  | {
      status: "error";
      payload: null;
      error: string;
};

const WELCOME_STORAGE_PREFIX = "dramapro.premium.welcome.v1";
const WELCOME_CHECK_ATTEMPTS = 4;
const WELCOME_CHECK_DELAY_MS = 850;

function shouldShowPremiumModal(params: URLSearchParams) {
  const premiumValue = params.get("premium");
  const upgradeValue = params.get("upgrade");

  return (
    premiumValue === "1" ||
    premiumValue === "true" ||
    upgradeValue === "1" ||
    upgradeValue === "true"
  );
}

function canAutoShowWelcome(pathname: string | null) {
  const path = pathname || "/";

  if (
    path.startsWith("/admin") ||
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.startsWith("/vip") ||
    path.startsWith("/watch-player") ||
    /^\/watch\/[^/]+\/play$/.test(path)
  ) {
    return false;
  }

  return true;
}

async function fetchPremiumModalPayload() {
  const response = await fetch("/api/vip/plans", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = (await response.json()) as
    | PremiumModalPayload
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Paket premium belum bisa dimuat.",
    );
  }

  return payload as PremiumModalPayload;
}

function getWelcomeStorageKey(payload: PremiumModalPayload) {
  const userKey = payload.user.id ?? payload.user.name ?? "signed-in";
  const vipKey = payload.user.vipExpiresAt ?? "free";
  const planKey =
    payload.plans.map((plan) => `${plan.id}:${plan.priceAmount}`).join("|") ||
    "no-plans";

  return `${WELCOME_STORAGE_PREFIX}:${userKey}:${vipKey}:${planKey}`;
}

function hasDismissedWelcome(payload: PremiumModalPayload) {
  try {
    return window.sessionStorage.getItem(getWelcomeStorageKey(payload)) === "1";
  } catch {
    return false;
  }
}

function rememberWelcomeDismissal(payload: PremiumModalPayload) {
  try {
    window.sessionStorage.setItem(getWelcomeStorageKey(payload), "1");
  } catch {
    // Ignore private browsing/session storage failures.
  }
}

function cleanPremiumParams(params: URLSearchParams) {
  params.delete("premium");
  params.delete("upgrade");
}

function formatIdr(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDurationLabel(days: number) {
  if (days >= 3650) {
    return "Lifetime Pass";
  }

  if (days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? "Monthly Pass" : `${months} Month Pass`;
  }

  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? "Weekly Pass" : `${weeks} Week Pass`;
  }

  if (days === 1) {
    return "Daily Pass";
  }

  return `${days} Hari`;
}

function formatPlanDescription(plan: PremiumPlan) {
  if (plan.description?.trim()) {
    return plan.description.trim();
  }

  if (plan.durationDays >= 3650) {
    return "Akses penuh selamanya.";
  }

  return `Akses penuh selama ${plan.durationDays} hari.`;
}

function formatVipDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

export function PremiumModal() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const manualOpen = shouldShowPremiumModal(searchParams);
  const hasAuthModal = searchParams.has("auth");
  const hasPremiumEpisodeModal = searchParams.has("premiumEpisode");
  const [autoOpen, setAutoOpen] = useState(false);
  const isOpen = manualOpen || autoOpen;
  const hasRequestedCurrentOpenRef = useRef(false);
  const [state, setState] = useState<PremiumModalState>({
    status: "idle",
    payload: null,
    error: "",
  });

  const next = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    cleanPremiumParams(params);

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname || "/";
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isOpen) {
      hasRequestedCurrentOpenRef.current = false;
      return;
    }

    if (state.status === "ready" || hasRequestedCurrentOpenRef.current) {
      return;
    }

    hasRequestedCurrentOpenRef.current = true;
    let isMounted = true;

    async function loadPremiumData() {
      setState({
        status: "loading",
        payload: null,
        error: "",
      });

      try {
        const payload = await fetchPremiumModalPayload();

        if (!isMounted) {
          return;
        }

        setState({
          status: "ready",
          payload: payload as PremiumModalPayload,
          error: "",
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          payload: null,
          error: "Paket premium belum bisa dimuat.",
        });
      }
    }

    void loadPremiumData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, state.status]);

  useEffect(() => {
    if (
      manualOpen ||
      autoOpen ||
      hasAuthModal ||
      hasPremiumEpisodeModal ||
      !canAutoShowWelcome(pathname)
    ) {
      return;
    }

    let isCancelled = false;
    let attempts = 0;
    let timeoutId: number | undefined;

    async function checkDetectedUser() {
      attempts += 1;

      try {
        const payload = await fetchPremiumModalPayload();

        if (isCancelled) {
          return;
        }

        if (payload.user.isSignedIn) {
          setState({
            status: "ready",
            payload,
            error: "",
          });

          if (!hasDismissedWelcome(payload)) {
            setAutoOpen(true);
          }

          return;
        }
      } catch {
        // Keep the page quiet; the manual premium button can still load details.
      }

      if (!isCancelled && attempts < WELCOME_CHECK_ATTEMPTS) {
        timeoutId = window.setTimeout(
          checkDetectedUser,
          WELCOME_CHECK_DELAY_MS,
        );
      }
    }

    timeoutId = window.setTimeout(checkDetectedUser, WELCOME_CHECK_DELAY_MS);

    return () => {
      isCancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [autoOpen, hasAuthModal, hasPremiumEpisodeModal, manualOpen, pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function closeModal() {
    if (payload?.user.isSignedIn) {
      rememberWelcomeDismissal(payload);
    }

    setAutoOpen(false);

    if (!manualOpen) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    cleanPremiumParams(params);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname || "/", {
      scroll: false,
    });
  }

  const payload = state.status === "ready" ? state.payload : null;
  const isSignedIn = Boolean(payload?.user.isSignedIn);
  const vipDate = formatVipDate(payload?.user.vipExpiresAt ?? null);
  const cheapestPlan = payload ? getCheapestPlan(payload.plans) : null;

  return (
    <div className="fixed inset-0 z-[118] flex items-start justify-center overflow-hidden bg-black/76 px-3 pb-[calc(0.8rem_+_env(safe-area-inset-bottom))] pt-[calc(4.75rem_+_env(safe-area-inset-top))] backdrop-blur-xl sm:items-center sm:px-6 sm:py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup premium"
        onClick={closeModal}
      />
      <section className="relative z-10 flex max-h-[calc(100dvh_-_5.75rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-[560px] flex-col overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#050719]/96 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:max-h-[calc(100dvh_-_3rem)] sm:rounded-[1.75rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,184,56,0.18),transparent_27%),radial-gradient(circle_at_96%_34%,rgba(34,211,238,0.1),transparent_23%)]" />
        <div className="absolute inset-px rounded-[1.35rem] border border-white/[0.035] sm:rounded-[1.65rem]" />
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

        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-[4.5rem] items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffca48,#ff9f24)] text-[#221100] shadow-[0_18px_48px_rgba(255,180,41,0.28)]">
              <Crown className="size-9" strokeWidth={2.4} />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
              {payload?.user.hasActiveVip
                ? "Premium kamu aktif"
                : "Selamat Datang di Layar Drama!"}
            </h2>
            <p className="mt-3 max-w-[420px] text-sm font-semibold leading-7 text-white/58 sm:text-base">
              Nikmati akses tak terbatas ke semua episode premium dengan harga
              terjangkau.
            </p>
            {payload?.user.hasActiveVip && vipDate ? (
              <p className="mt-2 rounded-full border border-emerald-300/12 bg-emerald-400/8 px-3 py-1 text-xs font-medium text-emerald-100/80">
                VIP aktif sampai {vipDate}
              </p>
            ) : null}
          </div>

          <PremiumBenefitGrid cheapestPlan={cheapestPlan} />

          <div className="mt-7 space-y-3">
            {!isSignedIn ? (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  cleanPremiumParams(params);
                  params.set("auth", "sign-in");
                  params.set("next", "/vip");
                  router.replace(`${pathname}?${params.toString()}`, {
                    scroll: false,
                  });
                }}
                className="group flex w-full items-center gap-4 rounded-[1.05rem] border border-cyan-300/10 bg-cyan-300/7 p-3.5 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
              >
                <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-red-400/25 bg-red-500/10 text-red-300">
                  <Play className="size-6 fill-current" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    Masuk untuk berlangganan
                  </span>
                  <span className="mt-1 block text-xs text-white/42">
                    Buat akun atau masuk
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-cyan-200/70 transition group-hover:translate-x-0.5" />
              </button>
            ) : null}

            {state.status === "loading" || state.status === "idle" ? (
              <div className="flex min-h-52 items-center justify-center rounded-[1.05rem] border border-white/8 bg-white/[0.025]">
                <LoaderCircle className="size-6 animate-spin text-amber-300" />
              </div>
            ) : null}

            {state.status === "error" ? (
              <div className="rounded-[1.05rem] border border-red-400/20 bg-red-500/10 px-4 py-5 text-center text-sm text-red-100">
                {state.error}
              </div>
            ) : null}

            {payload?.plans.map((plan) => (
              <PremiumPlanRow
                key={plan.id}
                plan={plan}
                isSignedIn={isSignedIn}
                next={next}
              />
            ))}

            {payload && payload.plans.length === 0 ? (
              <div className="rounded-[1.05rem] border border-white/8 bg-white/[0.025] px-4 py-6 text-center text-sm text-white/50">
                Paket premium belum tersedia.
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-white/52">
            {["Batalkan kapan saja", "Akses instan", "Semua perangkat"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-300/70" />
                {item}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="mt-5 w-full rounded-full px-4 py-3 text-center text-sm font-semibold text-white/46 transition hover:bg-white/[0.04] hover:text-white/72"
          >
            Nanti saja, lihat-lihat dulu
          </button>
        </div>
      </section>
    </div>
  );
}

function getCheapestPlan(plans: PremiumPlan[]) {
  return plans.reduce<PremiumPlan | null>((cheapest, plan) => {
    if (!cheapest || plan.priceAmount < cheapest.priceAmount) {
      return plan;
    }

    return cheapest;
  }, null);
}

function PremiumBenefitGrid({
  cheapestPlan,
}: {
  cheapestPlan: PremiumPlan | null;
}) {
  const startingPrice = cheapestPlan
    ? formatIdr(cheapestPlan.priceAmount, cheapestPlan.currency)
    : "harga terbaik";
  const items = [
    {
      icon: <Film className="size-5" />,
      label: "Semua episode premium",
    },
    {
      icon: <Sparkles className="size-5" />,
      label: "Kualitas HD",
    },
    {
      icon: <Clock3 className="size-5" />,
      label: "Akses kapan saja",
    },
    {
      icon: <Zap className="size-5" />,
      label: `Mulai ${startingPrice}`,
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 rounded-[1.1rem] border border-white/8 bg-[#0a0e22]/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300 shadow-[0_10px_22px_rgba(255,48,54,0.12)]">
            {item.icon}
          </span>
          <span className="text-sm font-semibold leading-5 text-white/82">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function PremiumPlanRow({
  plan,
  isSignedIn,
  next,
}: {
  plan: PremiumPlan;
  isSignedIn: boolean;
  next: string;
}) {
  const vipHref = `/vip?plan=${encodeURIComponent(plan.id)}&next=${encodeURIComponent(next)}`;
  const href = isSignedIn
    ? vipHref
    : `?auth=sign-in&next=${encodeURIComponent(vipHref)}`;

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "group flex w-full items-center gap-4 rounded-[1.05rem] border border-cyan-300/14 bg-[#071023]/78 p-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition hover:border-cyan-300/30 hover:bg-[#0a142b]",
        !isSignedIn && "opacity-55",
      )}
    >
      <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5b8cff,#3867f4)] text-white shadow-[0_12px_26px_rgba(65,111,255,0.25)]">
        <Zap className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white sm:text-base">
          {formatIdr(plan.priceAmount, plan.currency)}
          <span className="ml-1 text-xs font-semibold text-white/45">
            / {formatDurationLabel(plan.durationDays)}
          </span>
        </span>
        <span className="mt-1 block truncate text-xs font-medium text-white/42">
          {formatPlanDescription(plan)}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-cyan-200/70 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
