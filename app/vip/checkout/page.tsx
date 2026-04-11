import Link from "next/link";
import { ChevronLeft, Crown, QrCode, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { createVipCheckoutAction } from "@/app/vip/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPaymenkuPaymentChannels } from "@/lib/paymenku";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VipCheckoutPage(
  props: PageProps<"/vip/checkout">,
) {
  const searchParams = await props.searchParams;
  const planId =
    typeof searchParams.plan === "string" ? searchParams.plan : null;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/vip",
  );

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/vip/checkout?plan=${planId ?? ""}&next=${encodeURIComponent(next)}`)}`);
  }

  if (!planId) {
    redirect(`/vip?next=${encodeURIComponent(next)}`);
  }

  const [plan, channels] = await Promise.all([
    prisma.vipPricePlan.findFirst({
      where: { id: planId, isActive: true },
    }),
    getPaymenkuPaymentChannels().catch(() => []),
  ]);

  if (!plan) {
    redirect(`/vip?error=${encodeURIComponent("Paket VIP tidak tersedia.")}&next=${encodeURIComponent(next)}`);
  }

  const availableChannels =
    channels.length > 0
      ? channels
      : [{ code: "qris", name: "QRIS", fee: "Rp 200 + 0.70%" }];

  const preferredChannel =
    availableChannels.find((channel) => channel.code === "qris") ??
    availableChannels[0];

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
        <Badge className="border-amber-400/20 bg-amber-500/10 text-amber-200">
          <ShieldCheck className="mr-2 size-3.5" />
          Checkout aman dari server
        </Badge>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Checkout VIP
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                {plan.name}
              </h1>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Buat transaksi ke Paymenku untuk mengaktifkan paket VIP pilihanmu.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Paket dipilih
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Durasi {plan.durationDays} hari
                  </p>
                </div>
                <Badge className="border-amber-400/20 bg-amber-500/10 text-amber-200">
                  <Crown className="mr-2 size-3.5" />
                  {formatIdr(plan.priceAmount, plan.currency)}
                </Badge>
              </div>

              {plan.description ? (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {plan.description}
                </p>
              ) : null}
            </div>

            <form action={createVipCheckoutAction} className="space-y-5">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="next" value={next} />

              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Pilih channel pembayaran</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableChannels.map((channel) => (
                    <label
                      key={channel.code}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[1.4rem] border px-4 py-4 transition",
                        channel.code === preferredChannel.code
                          ? "border-amber-400/25 bg-amber-500/10"
                          : "border-white/10 bg-white/5",
                      )}
                    >
                      <input
                        type="radio"
                        name="channelCode"
                        value={channel.code}
                        defaultChecked={channel.code === preferredChannel.code}
                        className="mt-1 size-4 accent-[var(--accent)]"
                      />
                      <div>
                        <p className="font-semibold text-white">{channel.name}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                          Code: {channel.code}
                          {channel.fee ? ` • Fee ${channel.fee}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-[var(--muted)]">
                Transaksi akan dibuat atas nama <span className="text-white">{user.name}</span>{" "}
                dengan email <span className="text-white">{user.email}</span>.
              </div>

              {error ? (
                <div className="rounded-[1.4rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="h-12 w-full rounded-2xl">
                <QrCode className="mr-2 size-4" />
                Buat transaksi sekarang
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Setelah klik bayar
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Alur pembayaran
              </h2>
            </div>

            <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
              <p>1. Sistem membuat transaksi ke Paymenku dari server.</p>
              <p>2. Kamu akan masuk ke halaman pembayaran internal VIP.</p>
              <p>3. Scan QRIS atau buka `pay_url` dari transaksi.</p>
              <p>4. Status pembayaran dicek dari server dan VIP aktif otomatis saat sukses.</p>
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
