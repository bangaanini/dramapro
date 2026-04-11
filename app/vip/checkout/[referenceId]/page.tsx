import Link from "next/link";
import { CheckCircle2, ChevronLeft, ExternalLink, RefreshCcw } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";
import { cn } from "@/lib/utils";
import { syncVipPaymentStatus } from "@/lib/vip-payments";

export const dynamic = "force-dynamic";

export default async function VipCheckoutDetailPage(
  props: PageProps<"/vip/checkout/[referenceId]">,
) {
  const { referenceId } = await props.params;
  const searchParams = await props.searchParams;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/vip",
  );
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/vip/checkout/${referenceId}?next=${encodeURIComponent(next)}`)}`);
  }

  const syncedPayment = await syncVipPaymentStatus(referenceId, user.id).catch(
    () => null,
  );

  const payment =
    syncedPayment ??
    (await prisma.vipPayment.findUnique({
      where: { referenceId },
      include: {
        plan: true,
      },
    }));

  if (!payment || payment.userId !== user.id) {
    notFound();
  }

  const isPaid = payment.status === "paid";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/vip?next=${encodeURIComponent(next)}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="mr-2 size-4" />
          Kembali ke VIP
        </Link>
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

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Transaksi VIP
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                {payment.plan.name}
              </h1>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Reference ID: <span className="text-white">{payment.referenceId}</span>
              </p>
            </div>

            {isPaid ? (
              <div className="rounded-[1.6rem] border border-emerald-400/20 bg-emerald-500/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Pembayaran berhasil
                    </p>
                    <p className="mt-2 text-sm leading-7 text-emerald-100/88">
                      VIP sudah aktif untuk akunmu. Akses episode premium sekarang
                      terbuka sesuai durasi paket.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={next} className={buttonVariants({ size: "sm" })}>
                        Lanjutkan ke konten
                      </Link>
                      <Link
                        href="/profile"
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        Buka profil
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {payment.qrUrl ? (
                  <div className="rounded-[1.8rem] border border-white/10 bg-white p-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={payment.qrUrl}
                      alt={`QR pembayaran ${payment.referenceId}`}
                      className="mx-auto w-full max-w-[320px] rounded-2xl"
                    />
                  </div>
                ) : (
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm text-[var(--muted)]">
                    QR belum tersedia dari gateway. Gunakan tombol buka pembayaran.
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={payment.payUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ size: "lg" }), "rounded-2xl")}
                  >
                    <ExternalLink className="mr-2 size-4" />
                    Buka pembayaran
                  </Link>
                  <Link
                    href={`/vip/checkout/${payment.referenceId}?next=${encodeURIComponent(next)}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "lg" }),
                      "rounded-2xl",
                    )}
                  >
                    <RefreshCcw className="mr-2 size-4" />
                    Refresh status
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Ringkasan pembayaran
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Detail transaksi
              </h2>
            </div>

            <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Paket</span>
                <span className="font-medium text-white">{payment.plan.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Channel</span>
                <span className="font-medium text-white">
                  {payment.channelName || payment.channelCode.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Nominal</span>
                <span className="font-medium text-white">
                  {formatIdr(payment.paidAmount ?? payment.amount, payment.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Status</span>
                <span className="font-medium capitalize text-white">{payment.status}</span>
              </div>
              {payment.expiresAt ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--muted)]">Berlaku sampai</span>
                  <span className="font-medium text-white">
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(payment.expiresAt)}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100/88">
              Setelah kamu selesai membayar, klik <span className="font-semibold text-white">Refresh status</span>. Jika pembayaran sudah sukses, akses VIP akan aktif otomatis di akunmu.
            </div>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}

function formatIdr(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
