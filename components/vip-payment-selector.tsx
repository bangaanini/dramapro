"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Info,
  QrCode,
  X,
} from "lucide-react";

import { createVipCheckoutAction } from "@/app/vip/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type VipPlanOption = {
  id: string;
  name: string;
  description: string | null;
  badgeText: string;
  badgeColor: string;
  durationDays: number;
  priceAmount: number;
  currency: string;
};

type PaymentChannelOption = {
  code: string;
  name: string;
  group: "qris" | "va" | "ewallet" | "other";
  bankName?: string;
  shortName?: string;
};

type VipPaymentSelectorProps = {
  plans: VipPlanOption[];
  next: string;
  userHasVip: boolean;
  initialPlanId?: string | null;
  channels: PaymentChannelOption[];
};

const MINIMUM_VA_AMOUNT = 20000;
const BANK_TRANSFER_FEE = 4000;

export function VipPaymentSelector({
  plans,
  next,
  userHasVip,
  initialPlanId,
  channels,
}: VipPaymentSelectorProps) {
  const vaChannels = useMemo(
    () => channels.filter((channel) => channel.group === "va"),
    [channels],
  );
  const qrisChannel =
    channels.find((channel) => channel.code === "qris") ??
    channels.find((channel) => channel.group === "qris") ??
    null;
  const selectedDefaultPlanId =
    initialPlanId && plans.some((plan) => plan.id === initialPlanId)
      ? initialPlanId
      : plans[0]?.id ?? "";

  const [selectedPlanId, setSelectedPlanId] = useState(selectedDefaultPlanId);
  const [selectedChannelCode, setSelectedChannelCode] = useState(
    qrisChannel?.code ?? vaChannels[0]?.code ?? channels[0]?.code ?? "qris",
  );
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const isVaAllowed = (selectedPlan?.priceAmount ?? 0) >= MINIMUM_VA_AMOUNT;
  const requestedChannel =
    channels.find((channel) => channel.code === selectedChannelCode) ?? null;
  const selectedChannel =
    requestedChannel && (requestedChannel.group !== "va" || isVaAllowed)
      ? requestedChannel
      : qrisChannel ?? (isVaAllowed ? vaChannels[0] : null) ?? channels[0] ?? null;
  const selectedGroup = selectedChannel?.group === "va" ? "va" : "qris";
  const transferFee = selectedGroup === "va" ? BANK_TRANSFER_FEE : 0;
  const totalAmount = (selectedPlan?.priceAmount ?? 0) + transferFee;

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  if (!selectedPlan || !selectedChannel) {
    return null;
  }

  function selectQris() {
    triggerSelectionHaptic();
    setSelectedChannelCode(qrisChannel?.code ?? selectedChannel.code);
  }

  function selectBankTab() {
    if (!isVaAllowed || vaChannels.length === 0) {
      triggerSelectionHaptic();
      setToast("Minimal pembayaran dengan VA adalah Rp 20.000.");
      return;
    }

    triggerSelectionHaptic();
    setSelectedChannelCode((current) =>
      vaChannels.some((channel) => channel.code === current)
        ? current
        : vaChannels[0]?.code ?? current,
    );
  }

  const submitLabel =
    selectedGroup === "va"
      ? `Bayar dengan ${selectedChannel.shortName ?? selectedChannel.name}`
      : "Bayar dengan QRIS";

  return (
    <div className="relative flex max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#050719]/98 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:max-h-[calc(100dvh_-_1.5rem)] sm:rounded-[1.8rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,65,65,0.14),transparent_27%),radial-gradient(circle_at_92%_26%,rgba(78,123,255,0.14),transparent_24%)]" />

      <div className="relative z-20 flex shrink-0 justify-start px-4 pb-1 pt-4 sm:px-6">
        <Link
          href={next}
          className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#0b1024]/92 text-white/78 shadow-[0_12px_34px_rgba(0,0,0,0.42)] transition hover:bg-white/10 hover:text-white"
          aria-label="Tutup halaman VIP"
        >
          <X className="size-5" />
        </Link>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1 sm:px-6 sm:pb-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-[4.5rem] items-center justify-center rounded-full bg-red-500/12 text-red-300 shadow-[0_0_46px_rgba(255,55,71,0.26)] ring-1 ring-red-400/10">
            <CreditCard className="size-9" strokeWidth={2.4} />
          </div>
          <h1 className="mt-5 max-w-sm text-xl font-semibold leading-8 text-white sm:text-2xl">
            Pilih metode pembayaran yang kamu inginkan
          </h1>
          {userHasVip ? (
            <p className="mt-2 text-xs font-medium text-emerald-200/78">
              Perpanjang premium dengan paket baru.
            </p>
          ) : null}
        </div>

        {plans.length > 1 ? (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {plans.map((plan) => {
              const isSelected = plan.id === selectedPlan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onPointerDown={() => triggerSelectionHaptic()}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
                    isSelected
                      ? "border-red-400/35 bg-red-500/14 text-white"
                      : "border-white/8 bg-white/[0.035] text-white/45 hover:bg-white/[0.06] hover:text-white/72",
                  )}
                >
                  {plan.name} · {formatIdr(plan.priceAmount, plan.currency)}
                </button>
              );
            })}
          </div>
        ) : null}

        <section className="mt-5 rounded-[1.1rem] border border-white/10 bg-[#06091c]/86 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 text-white/50">
              <span>Harga paket</span>
              <span className="font-semibold text-white/86">
                {formatIdr(selectedPlan.priceAmount, selectedPlan.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-white/50">
              <span>Biaya transfer bank</span>
              <span className="font-semibold text-white/66">
                {transferFee > 0 ? `+ ${formatIdr(transferFee, selectedPlan.currency)}` : "Rp 0"}
              </span>
            </div>
            <div className="h-px bg-white/8" />
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-white">Total</span>
              <span className="text-lg font-bold text-red-400">
                {formatIdr(totalAmount, selectedPlan.currency)}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-[1.05rem] border border-white/8 bg-white/[0.035] p-1.5">
          <button
            type="button"
            onClick={selectQris}
            className={cn(
              "inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-[0.9rem] text-sm font-semibold transition",
              selectedGroup === "qris"
                ? "bg-red-500 text-white shadow-[0_16px_34px_rgba(255,48,54,0.3)]"
                : "text-white/42 hover:bg-white/[0.04] hover:text-white/72",
            )}
          >
            <QrCode className="size-4.5" />
            QRIS
          </button>
          <button
            type="button"
            onClick={selectBankTab}
            className={cn(
              "inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-[0.9rem] text-sm font-semibold transition",
              selectedGroup === "va"
                ? "bg-red-500 text-white shadow-[0_16px_34px_rgba(255,48,54,0.3)]"
                : "text-white/42 hover:bg-white/[0.04] hover:text-white/72",
              (!isVaAllowed || vaChannels.length === 0) && "opacity-55",
            )}
          >
            <Building2 className="size-4.5" />
            Bank
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {selectedGroup === "qris" ? (
            <button
              type="button"
              onClick={selectQris}
              className="group flex w-full items-center gap-4 rounded-[1.1rem] border border-cyan-300/12 bg-[#071023]/84 p-3.5 text-left transition hover:border-cyan-300/26 hover:bg-[#0a142b]"
            >
              <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5b8cff,#3867f4)] text-white shadow-[0_12px_26px_rgba(65,111,255,0.25)]">
                <QrCode className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-white">QRIS</span>
                <span className="mt-1 block text-xs font-medium text-white/42">
                  Scan dengan aplikasi bank atau e-wallet
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-cyan-200/70 transition group-hover:translate-x-0.5" />
            </button>
          ) : (
            vaChannels.map((channel) => {
              const isSelected = selectedChannelCode === channel.code;
              const bankName = channel.bankName ?? channel.shortName ?? channel.name;

              return (
                <button
                  key={channel.code}
                  type="button"
                  onPointerDown={() => triggerSelectionHaptic()}
                  onClick={() => setSelectedChannelCode(channel.code)}
                  className={cn(
                    "group flex w-full items-center gap-4 rounded-[1.1rem] border bg-[#071023]/84 p-3.5 text-left transition hover:border-cyan-300/26 hover:bg-[#0a142b]",
                    isSelected ? "border-cyan-300/28" : "border-cyan-300/12",
                  )}
                >
                  <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5b8cff,#3867f4)] text-white shadow-[0_12px_26px_rgba(65,111,255,0.25)]">
                    <Building2 className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-base font-semibold text-white">
                      {bankName}
                      {isSelected ? (
                        <Check className="size-4 text-cyan-200" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-white/42">
                      Transfer Virtual Account
                    </span>
                    <span className="mt-1 block text-xs font-bold text-amber-300/86">
                      +{formatIdr(BANK_TRANSFER_FEE, selectedPlan.currency)} biaya transfer
                    </span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-cyan-200/70 transition group-hover:translate-x-0.5" />
                </button>
              );
            })
          )}
        </div>

        {selectedGroup === "va" && !isVaAllowed ? (
          <p className="mt-4 rounded-xl border border-amber-400/16 bg-amber-500/8 px-3 py-2 text-center text-xs leading-5 text-amber-100/80">
            Transfer bank tersedia untuk nominal minimal Rp 20.000.
          </p>
        ) : null}

        {toast ? (
          <div className="mt-4 flex items-start gap-3 rounded-[1rem] border border-amber-400/18 bg-amber-500/10 px-3 py-3 text-xs leading-5 text-amber-50">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-200" />
            <span className="flex-1">{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 text-amber-50/70 transition hover:text-white"
              aria-label="Tutup notifikasi"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      <form
        action={createVipCheckoutAction}
        className="relative shrink-0 border-t border-white/8 bg-[#040617]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 backdrop-blur-xl sm:px-6 sm:pb-5"
        onSubmit={() => setIsSubmitting(true)}
      >
        <input type="hidden" name="planId" value={selectedPlan.id} />
        <input type="hidden" name="channelCode" value={selectedChannel.code} />
        <input type="hidden" name="next" value={next} />

        <FormSubmitButton
          type="submit"
          size="lg"
          pendingLabel="Menyiapkan pembayaran..."
          idleLabel={submitLabel}
          className="h-[3.25rem] w-full rounded-[1rem] bg-red-500 text-base font-semibold text-white shadow-[0_18px_42px_rgba(255,48,54,0.3)] hover:bg-red-400 sm:h-14"
        />
      </form>

      {isSubmitting ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/46 px-4 backdrop-blur-sm">
          <div className="rounded-[1.4rem] border border-white/10 bg-[#06091c]/96 px-5 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-red-300/20 border-t-red-300" />
            <p className="mt-4 text-sm font-semibold text-white">
              Menyiapkan pembayaran
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatIdr(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
