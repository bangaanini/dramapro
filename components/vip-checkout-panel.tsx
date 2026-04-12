"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Copy,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  X,
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
  channelCode: string;
  channelName: string;
  channelGroup?: "qris" | "va" | "ewallet" | "other";
  bankName?: string | null;
  vaNumber?: string | null;
};

type VipCheckoutPanelProps = {
  initialPayment: VipCheckoutSnapshot;
  initialQrDataUrl: string | null;
  nextHref: string;
  closeHref?: string;
  presentation?: "page" | "sheet";
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
      "Masa berlaku pembayaran sudah habis. Buat transaksi baru agar bisa melanjutkan pembayaran.",
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
  closeHref = "/vip",
  presentation = "page",
}: VipCheckoutPanelProps) {
  const router = useRouter();
  const [payment, setPayment] = useState(initialPayment);
  const [qrDataUrl, setQrDataUrl] = useState(initialQrDataUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [hasCopiedVa, setHasCopiedVa] = useState(false);
  const [remainingLabel, setRemainingLabel] = useState<string | null>(null);
  const hasRefreshedAfterPaidRef = useRef(false);

  const isFinal = FINAL_STATUSES.has(payment.status);
  const statusCopy = STATUS_COPY[payment.status];
  const expiresAtDate = useMemo(
    () => (payment.expiresAt ? new Date(payment.expiresAt) : null),
    [payment.expiresAt],
  );
  const activatedAtDate = useMemo(
    () => (payment.activatedAt ? new Date(payment.activatedAt) : null),
    [payment.activatedAt],
  );
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
  const isVirtualAccount = payment.channelGroup === "va" || Boolean(payment.vaNumber);
  const isSheet = presentation === "sheet";
  const pendingDescription = isVirtualAccount
    ? "Selesaikan transfer ke nomor virtual account di bawah agar VIP aktif otomatis."
    : "Scan QRIS di bawah";

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
    if (!expiresAtDate || FINAL_STATUSES.has(payment.status)) {
      setRemainingLabel(null);
      return;
    }

    const expiresAtTimestamp = expiresAtDate.getTime();

    function syncRemaining() {
      const diff = expiresAtTimestamp - Date.now();

      if (diff <= 0) {
        setRemainingLabel("00:00:00");
        return;
      }

      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1_000);

      setRemainingLabel(
        [hours, minutes, seconds]
          .map((part) => String(part).padStart(2, "0"))
          .join(":"),
      );
    }

    syncRemaining();
    const intervalId = window.setInterval(syncRemaining, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expiresAtDate, payment.status]);

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

  async function handleCopyVaNumber() {
    if (!payment.vaNumber) {
      return;
    }

    try {
      triggerSelectionHaptic();
      await navigator.clipboard.writeText(payment.vaNumber);
      setHasCopiedVa(true);
      window.setTimeout(() => setHasCopiedVa(false), 1800);
    } catch {
      setHasCopiedVa(false);
    }
  }

  const content = (
    <section
      className={cn(
        "grid gap-6",
        isSheet ? "mt-0" : "mt-6 lg:grid-cols-[1fr_0.9fr]",
      )}
    >
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
                <p className="text-sm leading-7">
                  {payment.status === "pending"
                    ? pendingDescription
                    : statusCopy.description}
                </p>
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
              {isVirtualAccount && payment.vaNumber ? (
                <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Total pembayaran
                    </p>
                    <p className="mt-3 text-4xl font-semibold text-white">
                      {amountLabel}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/18 bg-amber-500/10 px-3 py-1 text-sm text-amber-200">
                      <span
                        className={cn(
                          "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                          getBankBadgeTone(payment.bankName ?? payment.channelName),
                        )}
                      >
                        {getBankInitials(payment.bankName ?? payment.channelName)}
                      </span>
                      {payment.bankName ?? payment.channelName}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-center text-xs uppercase tracking-[0.22em] text-white/45">
                      Nomor Virtual Account
                    </p>
                    <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-black/20 p-3">
                      <div className="min-w-0 flex-1 rounded-[1rem] bg-black/20 px-4 py-3 text-center text-lg font-semibold tracking-[0.16em] text-white">
                        {payment.vaNumber}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopyVaNumber()}
                        className={cn(
                          buttonVariants({ variant: "secondary", size: "sm" }),
                          "h-12 rounded-2xl px-4",
                        )}
                      >
                        <Copy className="mr-2 size-4" />
                        {hasCopiedVa ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                  </div>

                  {remainingLabel ? (
                    <div className="rounded-[1.35rem] border border-indigo-400/15 bg-indigo-500/10 px-4 py-3 text-center">
                      <p className="text-sm font-semibold tracking-[0.14em] text-indigo-100">
                        {remainingLabel}
                      </p>
                      <p className="mt-1 text-xs text-indigo-100/70">
                        Kedaluwarsa dalam
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[1.35rem] border border-amber-400/15 bg-amber-500/10 p-4 text-sm leading-7 text-amber-50">
                    Transfer tepat <span className="font-semibold">{amountLabel}</span> ke
                    nomor VA di atas. Pembayaran akan dikonfirmasi otomatis.
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-black/15 p-4">
                    <p className="text-sm font-semibold text-white">
                      Cara bayar via {payment.bankName ?? payment.channelName}
                    </p>
                    <div className="mt-4 space-y-3">
                      {getVirtualAccountSteps(payment.bankName).map((step, index) => (
                        <div key={step} className="flex gap-3 text-sm text-white/72">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-100">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (payment.qrUrl || qrDataUrl) ? (
                <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 text-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Total pembayaran
                    </p>
                    <p className="mt-3 text-4xl font-semibold text-white">
                      {amountLabel}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={payment.qrUrl ?? qrDataUrl ?? ""}
                      alt={`QR pembayaran ${payment.referenceId}`}
                      className="mx-auto w-full max-w-[320px] rounded-2xl"
                    />
                  </div>

                  {remainingLabel ? (
                    <div className="rounded-[1.35rem] border border-indigo-400/15 bg-indigo-500/10 px-4 py-3 text-center">
                      <p className="text-sm font-semibold tracking-[0.14em] text-indigo-100">
                        {remainingLabel}
                      </p>
                      <p className="mt-1 text-xs text-indigo-100/70">
                        Kedaluwarsa dalam
                      </p>
                    </div>
                  ) : null}

                  <div className="text-sm text-white/62">
                    Scan dengan aplikasi QRIS manapun.
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm text-[var(--muted)]">
                  Pembayaran sedang disiapkan. Jika belum muncul, gunakan
                  tombol buka pembayaran atau tunggu beberapa detik.
                </div>
              )}

              {isVirtualAccount ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onPointerDown={() => triggerSelectionHaptic()}
                    onClick={() => void handleManualRefresh()}
                    disabled={isRefreshing}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-12 w-full rounded-2xl bg-[linear-gradient(180deg,#4a8cff,#2d67ff)] text-white hover:brightness-105",
                    )}
                  >
                    {isRefreshing ? (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="mr-2 size-4" />
                    )}
                    Sudah transfer? Cek di sini
                  </button>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={payment.payUrl}
                      target="_blank"
                      rel="noreferrer"
                      onPointerDown={() => triggerSelectionHaptic()}
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "sm" }),
                        "rounded-2xl",
                      )}
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Buka halaman Paymenku
                    </Link>
                  </div>
                </div>
              ) : (
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
              )}
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
            {payment.bankName ? (
              <SummaryRow label="Bank" value={payment.bankName} />
            ) : null}
            {payment.vaNumber ? (
              <SummaryRow label="Nomor VA" value={payment.vaNumber} />
            ) : null}
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

  if (!isSheet) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <Link
        href={closeHref}
        onPointerDown={() => triggerSelectionHaptic()}
        className="absolute inset-0 bg-black/72 backdrop-blur-sm"
        aria-label="Tutup checkout"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(28,18,12,0.98),rgba(14,10,8,0.99))] px-4 pb-[calc(1.2rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-28px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto max-w-5xl">
          <div className="relative sticky top-0 z-10 flex items-center justify-between gap-3 bg-transparent pb-3 pt-1">
            <span className="mx-auto h-1.5 w-16 rounded-full bg-white/18" />
            <Link
              href={closeHref}
              onPointerDown={() => triggerSelectionHaptic()}
              className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/78 transition hover:bg-white/10"
              aria-label="Tutup checkout"
            >
              <X className="size-4" />
            </Link>
          </div>
          {content}
        </div>
      </div>
    </div>
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

function getVirtualAccountSteps(bankName?: string | null) {
  const bank = String(bankName ?? "").trim().toUpperCase();

  if (bank.includes("BNI")) {
    return [
      "Buka aplikasi BNI Mobile Banking.",
      "Pilih menu Transfer.",
      "Pilih Virtual Account Billing.",
      "Masukkan nomor VA di atas.",
      "Konfirmasi detail pembayaran.",
      "Masukkan PIN untuk menyelesaikan transfer.",
    ];
  }

  if (bank.includes("BRI")) {
    return [
      "Buka aplikasi BRImo atau ATM BRI.",
      "Pilih menu BRIVA atau Transfer Virtual Account.",
      "Masukkan nomor VA di atas.",
      "Periksa nama penerima dan nominal transfer.",
      "Konfirmasi lalu selesaikan pembayaran.",
    ];
  }

  if (bank.includes("MANDIRI")) {
    return [
      "Buka Livin' by Mandiri atau ATM Mandiri.",
      "Masuk ke menu Bayar atau Multipayment.",
      "Pilih Virtual Account.",
      "Masukkan nomor VA di atas.",
      "Konfirmasi detail pembayaran dan lanjutkan hingga selesai.",
    ];
  }

  if (bank.includes("BSI")) {
    return [
      "Buka aplikasi BYOND/BSI Mobile atau ATM BSI.",
      "Pilih menu Bayar atau Transfer Virtual Account.",
      "Masukkan nomor VA di atas.",
      "Periksa total pembayaran lalu lanjutkan.",
      "Selesaikan transaksi dengan PIN atau otorisasi perangkat.",
    ];
  }

  if (bank.includes("CIMB")) {
    return [
      "Buka aplikasi OCTO Mobile / OCTO Clicks atau ATM CIMB.",
      "Pilih menu Transfer atau Pembayaran Virtual Account.",
      "Masukkan nomor VA yang tertera.",
      "Verifikasi nama merchant dan nominal pembayaran.",
      "Konfirmasi pembayaran sampai status berhasil.",
    ];
  }

  if (bank.includes("PERMATA")) {
    return [
      "Buka aplikasi PermataMobile X atau ATM Permata.",
      "Pilih menu Pembayaran atau Virtual Account.",
      "Masukkan nomor VA di atas.",
      "Periksa detail transaksi lalu tekan lanjut.",
      "Masukkan PIN untuk menyelesaikan pembayaran.",
    ];
  }

  if (bank.includes("DANAMON")) {
    return [
      "Buka aplikasi D-Bank PRO atau ATM Danamon.",
      "Masuk ke menu Transfer / Bayar Virtual Account.",
      "Masukkan nomor virtual account di atas.",
      "Cek detail pembayaran dan pastikan nominal benar.",
      "Konfirmasi transaksi hingga berhasil.",
    ];
  }

  if (bank.includes("BJB")) {
    return [
      "Buka Digi by bank bjb atau ATM bank bjb.",
      "Pilih menu Pembayaran atau Virtual Account.",
      "Masukkan nomor VA yang tampil di halaman ini.",
      "Periksa nominal lalu konfirmasi pembayaran.",
      "Tunggu status VIP aktif otomatis setelah verifikasi.",
    ];
  }

  return [
    "Buka aplikasi mobile banking atau ATM sesuai bank pilihanmu.",
    "Masuk ke menu Transfer atau Virtual Account.",
    "Masukkan nomor virtual account di atas.",
    "Periksa nominal transfer lalu konfirmasi pembayaran.",
    "Status VIP akan aktif otomatis setelah pembayaran terverifikasi.",
  ];
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
