"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

type VipCheckoutSnapshot = {
  referenceId: string;
  status: PaymentStatus;
  payUrl: string;
  qrUrl: string | null;
  qrString: string | null;
  expiresAt: string | null;
  activatedAt: string | null;
  amount: number;
  currency: string;
  planName: string;
  channelName: string;
};

type VipCheckoutPanelProps = {
  initialPayment: VipCheckoutSnapshot;
  initialQrDataUrl: string | null;
  nextHref: string;
};

const FINAL_STATUSES = new Set<PaymentStatus>([
  "paid",
  "failed",
  "expired",
  "cancelled",
]);

const STATUS_COPY: Record<
  PaymentStatus,
  {
    title: string;
    description: string;
    tone: string;
  }
> = {
  pending: {
    title: "Menunggu pembayaran",
    description:
      "Scan QRIS di bawah",
    tone: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  },
  paid: {
    title: "Pembayaran berhasil",
    description:
      "VIP sudah aktif untuk akunmu. Semua episode premium sekarang bisa dibuka sesuai durasi paket.",
    tone: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  },
  failed: {
    title: "Pembayaran gagal",
    description:
      "Kamu bisa membuat transaksi baru dari halaman VIP.",
    tone: "border-red-400/20 bg-red-500/10 text-red-100",
  },
  expired: {
    title: "Transaksi kedaluwarsa",
    description:
      "Masa berlaku QRIS sudah habis. Buat transaksi baru agar bisa melanjutkan pembayaran.",
    tone: "border-red-400/20 bg-red-500/10 text-red-100",
  },
  cancelled: {
    title: "Transaksi dibatalkan",
    description:
      "Pembayaran dibatalkan sebelum selesai. Kamu bisa kembali ke halaman VIP untuk membuat transaksi baru.",
    tone: "border-red-400/20 bg-red-500/10 text-red-100",
  },
};

export function VipCheckoutPanel({
  initialPayment,
  initialQrDataUrl,
  nextHref,
}: VipCheckoutPanelProps) {
  const router = useRouter();
  const [payment, setPayment] = useState(initialPayment);
  const [qrDataUrl, setQrDataUrl] = useState(initialQrDataUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const hasRefreshedAfterPaidRef = useRef(false);

  const isFinal = FINAL_STATUSES.has(payment.status);
  const statusCopy = STATUS_COPY[payment.status];
  const expiresAtDate = payment.expiresAt ? new Date(payment.expiresAt) : null;
  const activatedAtDate = payment.activatedAt ? new Date(payment.activatedAt) : null;
  const formattedExpiry = expiresAtDate
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(expiresAtDate)
    : null;
  const formattedActivatedAt = activatedAtDate
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(activatedAtDate)
    : null;

  const amountLabel = useMemo(() => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: payment.currency,
      maximumFractionDigits: 0,
    }).format(payment.amount);
  }, [payment.amount, payment.currency]);

  useEffect(() => {
    let cancelled = false;

    async function buildQrDataUrl() {
      if (payment.qrUrl || !payment.qrString) {
        setQrDataUrl(null);
        return;
      }

      try {
        const nextDataUrl = await QRCode.toDataURL(payment.qrString, {
          margin: 1,
          width: 640,
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
        });

        if (!cancelled) {
          setQrDataUrl(nextDataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl(null);
        }
      }
    }

    void buildQrDataUrl();

    return () => {
      cancelled = true;
    };
  }, [payment.qrString, payment.qrUrl]);

  useEffect(() => {
    if (payment.status !== "paid" || hasRefreshedAfterPaidRef.current) {
      return;
    }

    hasRefreshedAfterPaidRef.current = true;
    startTransition(() => {
      router.refresh();
    });
  }, [payment.status, router]);

  useEffect(() => {
    if (isFinal) {
      return;
    }

    let disposed = false;

    async function syncStatus() {
      try {
        const response = await fetch(
          `/api/vip/transactions/${payment.referenceId}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Status pembayaran belum bisa diperbarui.");
        }

        const nextPayment = (await response.json()) as VipCheckoutSnapshot;

        if (disposed) {
          return;
        }

        setPayment(nextPayment);
        setPollError(null);
      } catch (error) {
        if (disposed) {
          return;
        }

        setPollError(
          error instanceof Error
            ? error.message
            : "Gagal memantau status pembayaran.",
        );
      } finally {
        if (!disposed) {
          setIsRefreshing(false);
        }
      }
    }

    const intervalId = window.setInterval(() => {
      void syncStatus();
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [isFinal, payment.referenceId]);

  async function handleManualRefresh() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch(`/api/vip/transactions/${payment.referenceId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Status pembayaran belum bisa diperbarui.");
      }

      const nextPayment = (await response.json()) as VipCheckoutSnapshot;
      setPayment(nextPayment);
      setPollError(null);
    } catch (error) {
      setPollError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status pembayaran.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Checkout VIP
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {payment.planName}
            </h1>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Reference ID:{" "}
              <span className="text-white">{payment.referenceId}</span>
            </p>
          </div>

          <div className={cn("rounded-[1.6rem] border p-5", statusCopy.tone)}>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white">
                {payment.status === "paid" ? (
                  <CheckCircle2 className="size-5" />
                ) : payment.status === "pending" ? (
                  <Clock3 className="size-5" />
                ) : (
                  <XCircle className="size-5" />
                )}
              </span>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-white">
                  {statusCopy.title}
                </p>
                <p className="text-sm leading-7">{statusCopy.description}</p>
                {payment.status === "pending" ? (
                  <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                    ...
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {payment.status === "pending" ? (
            <div className="space-y-5">
              {(payment.qrUrl || qrDataUrl) ? (
                <div className="rounded-[1.8rem] border border-white/10 bg-white p-4 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={payment.qrUrl ?? qrDataUrl ?? ""}
                    alt={`QR pembayaran ${payment.referenceId}`}
                    className="mx-auto w-full max-w-[320px] rounded-2xl"
                  />
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm text-[var(--muted)]">
                  QRIS sedang disiapkan.Jika belum muncul, gunakan
                  tombol buka pembayaran atau tunggu beberapa detik.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link
                  href={payment.payUrl}
                  target="_blank"
                  rel="noreferrer"
                  onPointerDown={() => triggerSelectionHaptic()}
                  className={cn(buttonVariants({ size: "lg" }), "rounded-2xl")}
                >
                  <ExternalLink className="mr-2 size-4" />
                  Buka pembayaran
                </Link>
                <button
                  type="button"
                  onPointerDown={() => triggerSelectionHaptic()}
                  onClick={() => void handleManualRefresh()}
                  disabled={isRefreshing}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "rounded-2xl",
                  )}
                >
                  {isRefreshing ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2 size-4" />
                  )}
                  Cek sekarang
                </button>
              </div>
            </div>
          ) : payment.status === "paid" ? (
            <div className="flex flex-wrap gap-3">
              <Link
                href={nextHref}
                onPointerDown={() => triggerSelectionHaptic()}
                className={buttonVariants({ size: "sm" })}
              >
                Lanjutkan ke konten
              </Link>
              <Link
                href="/profile"
                onPointerDown={() => triggerSelectionHaptic()}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Buka profil
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/vip?next=${encodeURIComponent(nextHref)}`}
                onPointerDown={() => triggerSelectionHaptic()}
                className={buttonVariants({ size: "sm" })}
              >
                Buat transaksi baru
              </Link>
              {payment.payUrl ? (
                <Link
                  href={payment.payUrl}
                  target="_blank"
                  rel="noreferrer"
                  onPointerDown={() => triggerSelectionHaptic()}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  <ExternalLink className="mr-2 size-4" />
                  Buka pembayaran
                </Link>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Ringkasan pembayaran
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Detail transaksi
              </h2>
            </div>
            <Badge
              className={cn(
                payment.status === "paid" &&
                  "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
                payment.status === "pending" &&
                  "border-amber-400/20 bg-amber-500/10 text-amber-200",
                payment.status !== "paid" &&
                  payment.status !== "pending" &&
                  "border-red-400/20 bg-red-500/10 text-red-200",
              )}
            >
              Status: {payment.status}
            </Badge>
          </div>

          <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-sm">
            <SummaryRow label="Paket" value={payment.planName} />
            <SummaryRow label="Channel" value={payment.channelName} />
            <SummaryRow label="Nominal" value={amountLabel} />
            {formattedExpiry ? (
              <SummaryRow label="Berlaku sampai" value={formattedExpiry} />
            ) : null}
            {formattedActivatedAt ? (
              <SummaryRow label="VIP aktif" value={formattedActivatedAt} />
            ) : null}
          </div>

          {pollError ? (
            <div className="rounded-[1.4rem] border border-red-400/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100">
              {pollError}
            </div>
          ) : null}


        </CardContent>
      </Card>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}
