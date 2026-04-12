"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Info,
  QrCode,
  X,
} from "lucide-react";

import { createVipCheckoutAction } from "@/app/vip/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type VipPlanOption = {
  id: string;
  name: string;
  description: string | null;
  badgeText: string;
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

export function VipPaymentSelector({
  plans,
  next,
  userHasVip,
  initialPlanId,
  channels,
}: VipPaymentSelectorProps) {
  const MINIMUM_VA_AMOUNT = 20000;
  const vaChannels = useMemo(
    () => channels.filter((channel) => channel.group === "va"),
    [channels],
  );

  const selectedDefaultPlanId =
    initialPlanId && plans.some((plan) => plan.id === initialPlanId)
      ? initialPlanId
      : plans[0]?.id ?? "";

  const [selectedPlanId, setSelectedPlanId] = useState(selectedDefaultPlanId);
  const [selectedChannelCode, setSelectedChannelCode] = useState("qris");
  const [expandedGroup, setExpandedGroup] = useState<"va" | "qris">("qris");
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const isVaAllowed = (selectedPlan?.priceAmount ?? 0) >= MINIMUM_VA_AMOUNT;
  const effectiveSelectedChannelCode =
    !isVaAllowed && selectedChannelCode !== "qris"
      ? "qris"
      : selectedChannelCode;
  const selectedChannel =
    channels.find((channel) => channel.code === effectiveSelectedChannelCode) ??
    channels[0] ??
    null;

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

  const submitLabel =
    selectedChannel.group === "va"
      ? `Bayar dengan ${selectedChannel.shortName ?? selectedChannel.name}`
      : "Bayar dengan QRIS";

  function showVaMinimumNotice() {
    triggerSelectionHaptic();
    setToast("Minimal pembayaran dengan VA adalah Rp 20.000.");
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,13,10,0.96),rgba(10,7,6,0.98))] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;

          return (
            <button
              key={plan.id}
              type="button"
              onPointerDown={() => triggerSelectionHaptic()}
              onClick={() => {
                setSelectedPlanId(plan.id);
              }}
              className={cn(
                "text-left transition-transform active:scale-[0.99]",
                isSelected && "translate-y-[-1px]",
              )}
            >
              <Card
                className={cn(
                  "h-full overflow-hidden rounded-[2rem] border p-0 transition",
                  isSelected
                    ? "border-amber-400/45 bg-[linear-gradient(180deg,rgba(75,49,11,0.95),rgba(27,19,11,0.98))] shadow-[0_28px_80px_rgba(255,177,21,0.18)]"
                    : plan.badgeText
                      ? "border-amber-400/25 bg-[linear-gradient(180deg,rgba(41,27,12,0.92),rgba(16,11,8,0.98))]"
                      : "glass-panel border-white/10",
                )}
              >
                <CardContent className="space-y-4 p-5">
                  {plan.badgeText ? (
                    <div className="inline-flex rounded-full border border-amber-300/22 bg-amber-400/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      {plan.badgeText}
                    </div>
                  ) : null}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/45">
                        {plan.name}
                      </p>
                      <p className="mt-3 text-xl font-semibold tracking-tight text-white">
                        {formatIdr(plan.priceAmount, plan.currency)}
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-[#392100]">
                        <CheckCircle2 className="size-4" />
                      </span>
                    ) : null}
                  </div>

                  
                </CardContent>
              </Card>
            </button>
          );
        })}
        </section>

        <Card className="glass-panel mt-4 rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-5">
          <div className="rounded-[1.75rem] border border-amber-400/18 bg-[linear-gradient(180deg,rgba(255,198,74,0.12),rgba(255,122,69,0.08))] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Paket dipilih
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  {selectedPlan.name}
                </h2>
                <p className="mt-2 text-sm text-white/62">
                  Durasi {selectedPlan.durationDays} hari
                </p>
              </div>
              <Badge className="rounded-full border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-amber-200">
                {formatIdr(selectedPlan.priceAmount, selectedPlan.currency)}
              </Badge>
            </div>
            {selectedPlan.badgeText ? (
              <div className="mt-4 inline-flex rounded-full border border-amber-300/20 bg-amber-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                {selectedPlan.badgeText}
              </div>
            ) : null}
            <p className="mt-5 text-sm leading-6 text-white/72">
              Akses semua episode drama
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Pilih metode pembayaran</p>

            {vaChannels.length > 0 ? (
              <button
                type="button"
                onPointerDown={() => {
                  if (!isVaAllowed) {
                    return;
                  }

                  triggerSelectionHaptic();
                }}
                onClick={() => {
                  if (!isVaAllowed) {
                    showVaMinimumNotice();
                    return;
                  }

                  setExpandedGroup((current) => (current === "va" ? "qris" : "va"));
                  if (expandedGroup !== "va" && vaChannels[0]) {
                    setSelectedChannelCode((current) =>
                      current === "qris" ? vaChannels[0].code : current,
                    );
                  }
                }}
                className={cn(
                  "w-full rounded-[1.5rem] border px-4 py-4 text-left transition",
                  expandedGroup === "va" || selectedChannel.group === "va"
                    ? "border-amber-400/40 bg-amber-500/10"
                    : "border-white/10 bg-white/5",
                  !isVaAllowed && "cursor-not-allowed border-white/8 bg-white/4 opacity-60",
                )}
                aria-disabled={!isVaAllowed}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white">
                      <Building2 className="size-5" />
                    </span>
                    <div>
                      <p className="font-medium text-white">Transfer Bank</p>
                      <p className="text-sm text-white/55">
                        BNI, BRI, Mandiri, BSI, CIMB, Permata, Danamon, BJB
                      </p>
                      {!isVaAllowed ? (
                        <p className="mt-1 text-xs text-amber-200/90">
                          Aktif mulai nominal Rp 20.000
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                        selectedChannel.group === "va"
                          ? "border-amber-300 bg-amber-300 text-[#392100]"
                          : "border-white/25 text-transparent",
                      )}
                    >
                      •
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-white/50 transition-transform",
                        expandedGroup === "va" && "rotate-180",
                      )}
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300",
                    expandedGroup === "va" ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2 border-t border-white/8 pt-3">
                      {vaChannels.map((channel) => {
                        const isSelected =
                          effectiveSelectedChannelCode === channel.code;

                        return (
                          <button
                            key={channel.code}
                            type="button"
                            onPointerDown={() => {
                              if (!isVaAllowed) {
                                return;
                              }

                              triggerSelectionHaptic();
                            }}
                            onClick={() => {
                              if (!isVaAllowed) {
                                showVaMinimumNotice();
                                return;
                              }

                              setSelectedChannelCode(channel.code);
                              setExpandedGroup("va");
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                              isSelected
                                ? "border-amber-400/40 bg-white/7 text-white"
                                : "border-white/8 bg-black/10 text-white/72",
                              !isVaAllowed && "cursor-not-allowed opacity-60",
                            )}
                            aria-disabled={!isVaAllowed}
                          >
                            <span className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                                  getBankBadgeTone(channel.bankName ?? channel.shortName ?? channel.name),
                                )}
                              >
                                {channel.shortName ?? getBankInitials(channel.bankName ?? channel.name)}
                              </span>
                              <span className="text-sm font-medium">
                                Bank {channel.bankName ?? channel.shortName ?? channel.name}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                                isSelected
                                  ? "border-amber-300 bg-amber-300 text-[#392100]"
                                  : "border-white/25 text-transparent",
                              )}
                            >
                              •
                            </span>
                          </button>
                        );
                      })}

                      <p className="pt-2 text-center text-xs text-white/35">
                        {isVaAllowed
                          ? "Bank tidak tersedia? Gunakan QRIS"
                          : "Nominal di bawah Rp 20.000, gunakan QRIS"}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ) : null}

            <button
              type="button"
              onPointerDown={() => triggerSelectionHaptic()}
              onClick={() => {
                setSelectedChannelCode("qris");
                setExpandedGroup("qris");
              }}
              className={cn(
                "flex w-full items-start justify-between gap-3 rounded-[1.5rem] border px-4 py-4 text-left transition",
                effectiveSelectedChannelCode === "qris"
                  ? "border-amber-400/40 bg-amber-500/10"
                  : "border-white/10 bg-white/5",
              )}
            >
              <div className="flex gap-3">
                <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white">
                  <QrCode className="size-5" />
                </span>
                <div>
                  <p className="font-medium text-white">QRIS</p>
                  <p className="text-sm text-white/55">
                    Scan dengan aplikasi bank / e-wallet apapun
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                  effectiveSelectedChannelCode === "qris"
                    ? "border-amber-300 bg-amber-300 text-[#392100]"
                    : "border-white/25 text-transparent",
                )}
              >
                •
              </span>
            </button>
          </div>

          <p className="text-center text-xs leading-6 text-white/38">
            Dengan melanjutkan, Anda menyetujui syarat dan ketentuan kami.
          </p>
          </CardContent>
        </Card>
      </div>

      <form
        action={createVipCheckoutAction}
        className="shrink-0 border-t border-white/10 bg-[rgba(9,7,6,0.96)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 backdrop-blur-xl sm:px-5 sm:pb-5"
        onSubmit={() => {
          setIsSubmitting(true);
        }}
      >
        <input type="hidden" name="planId" value={selectedPlan.id} />
        <input
          type="hidden"
          name="channelCode"
          value={effectiveSelectedChannelCode}
        />
        <input type="hidden" name="next" value={next} />

        <div className="mx-auto flex w-full items-center gap-3 rounded-[1.7rem] border border-amber-400/12 bg-[linear-gradient(180deg,rgba(255,186,64,0.06),rgba(255,122,69,0.04))] p-3">
          <div className="hidden min-w-0 flex-1 sm:block">
              <p className="text-sm text-white/55">
                {userHasVip ? "Perpanjang VIP dengan" : "Metode dipilih"}
              </p>
              <p className="truncate text-base font-medium text-white">
                {selectedChannel.group === "va"
                  ? `${selectedChannel.shortName ?? selectedChannel.bankName ?? selectedChannel.name} Virtual Account`
                  : "QRIS"}
              </p>
          </div>

          <FormSubmitButton
            type="submit"
            size="lg"
            pendingLabel="Menyiapkan pembayaran..."
            idleLabel={submitLabel}
            className="h-14 w-full rounded-2xl bg-[linear-gradient(180deg,#ffd05a,#f4ae16)] text-[#392100] hover:brightness-105 sm:w-auto sm:min-w-[280px]"
          />
        </div>
      </form>

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[95] flex justify-center px-4 sm:bottom-8">
          <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[1.35rem] border border-amber-400/20 bg-[rgba(39,21,7,0.94)] px-4 py-3 text-sm text-amber-50 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-200">
              <Info className="size-4" />
            </span>
            <span className="flex-1 leading-6">{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-amber-50/70 transition hover:bg-white/5 hover:text-white"
              aria-label="Tutup notifikasi"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {isSubmitting ? (
        <div className="pointer-events-none fixed inset-0 z-[96] flex items-center justify-center bg-black/38 px-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[2rem] border border-amber-400/16 bg-[linear-gradient(180deg,rgba(29,19,12,0.97),rgba(15,10,8,0.98))] p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-amber-300/20 border-t-amber-300" />
            <p className="mt-4 text-base font-semibold text-white">
              Menyiapkan pembayaran
            </p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Kami sedang membuat transaksi dan menampilkan detail pembayaranmu.
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

function getBankInitials(bankName: string) {
  const normalized = bankName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();

  return normalized || "BANK";
}

function getBankBadgeTone(bankName: string) {
  const normalized = bankName.toUpperCase();

  if (normalized.includes("BNI")) {
    return "bg-orange-500/20 text-orange-100 border border-orange-400/25";
  }

  if (normalized.includes("BRI")) {
    return "bg-sky-500/20 text-sky-100 border border-sky-400/25";
  }

  if (normalized.includes("MANDIRI")) {
    return "bg-yellow-500/20 text-yellow-100 border border-yellow-400/25";
  }

  if (normalized.includes("BSI")) {
    return "bg-emerald-500/20 text-emerald-100 border border-emerald-400/25";
  }

  if (normalized.includes("CIMB")) {
    return "bg-red-500/20 text-red-100 border border-red-400/25";
  }

  if (normalized.includes("PERMATA")) {
    return "bg-violet-500/20 text-violet-100 border border-violet-400/25";
  }

  if (normalized.includes("DANAMON")) {
    return "bg-amber-500/20 text-amber-100 border border-amber-400/25";
  }

  if (normalized.includes("BJB")) {
    return "bg-blue-500/20 text-blue-100 border border-blue-400/25";
  }

  return "bg-white/10 text-white border border-white/12";
}
