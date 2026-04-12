"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  QrCode,
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

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const selectedChannel =
    channels.find((channel) => channel.code === selectedChannelCode) ?? channels[0] ?? null;

  if (!selectedPlan || !selectedChannel) {
    return null;
  }

  const submitLabel =
    selectedChannel.group === "va"
      ? `Bayar dengan ${selectedChannel.shortName ?? selectedChannel.name}`
      : "Bayar dengan QRIS";

  return (
    <div className="space-y-5">
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
                    : "glass-panel border-white/10",
                )}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/45">
                        {plan.name}
                      </p>
                      <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                        {formatIdr(plan.priceAmount, plan.currency)}
                      </p>
                      <p className="mt-2 text-sm text-white/56">
                        untuk {plan.durationDays} hari
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-[#392100]">
                        <CheckCircle2 className="size-4" />
                      </span>
                    ) : null}
                  </div>

                  {plan.description ? (
                    <p className="text-sm leading-6 text-white/66">
                      {plan.description}
                    </p>
                  ) : (
                    <p className="text-sm leading-6 text-white/66">
                      Akses semua episode drama premium.
                    </p>
                  )}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </section>

      <Card className="glass-panel rounded-[2rem] border-white/10">
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
            <p className="mt-5 text-sm leading-6 text-white/72">
              Akses semua episode drama
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Pilih metode pembayaran</p>

            <button
              type="button"
              onPointerDown={() => triggerSelectionHaptic()}
              onClick={() => {
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
              )}
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
                      const isSelected = selectedChannelCode === channel.code;

                      return (
                        <button
                          key={channel.code}
                          type="button"
                          onPointerDown={() => triggerSelectionHaptic()}
                          onClick={() => {
                            setSelectedChannelCode(channel.code);
                            setExpandedGroup("va");
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                            isSelected
                              ? "border-amber-400/40 bg-white/7 text-white"
                              : "border-white/8 bg-black/10 text-white/72",
                          )}
                        >
                          <span className="text-sm font-medium">
                            Bank {channel.bankName ?? channel.shortName ?? channel.name}
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
                      Bank tidak tersedia? Gunakan QRIS
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onPointerDown={() => triggerSelectionHaptic()}
              onClick={() => {
                setSelectedChannelCode("qris");
                setExpandedGroup("qris");
              }}
              className={cn(
                "flex w-full items-start justify-between gap-3 rounded-[1.5rem] border px-4 py-4 text-left transition",
                selectedChannelCode === "qris"
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
                  selectedChannelCode === "qris"
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

      <form action={createVipCheckoutAction} className="pb-28 sm:pb-0">
        <input type="hidden" name="planId" value={selectedPlan.id} />
        <input type="hidden" name="channelCode" value={selectedChannel.code} />
        <input type="hidden" name="next" value={next} />

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(7,5,4,0.92)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-4 backdrop-blur-2xl sm:static sm:border-none sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 rounded-[1.7rem] border border-amber-400/12 bg-[linear-gradient(180deg,rgba(255,186,64,0.06),rgba(255,122,69,0.04))] p-3 sm:max-w-none sm:rounded-[1.9rem] sm:p-0 sm:border-0 sm:bg-transparent">
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
        </div>
      </form>
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
