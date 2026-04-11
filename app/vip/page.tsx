import Link from "next/link";
import {
  BadgeCheck,
  Crown,
  Gem,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { createVipCheckoutAction } from "@/app/vip/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";
import { cn } from "@/lib/utils";
import { getVipLockStartEpisode, isVipActive } from "@/lib/vip";

export const dynamic = "force-dynamic";

export default async function VipPage(props: PageProps<"/vip">) {
  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/vip",
  );
  const user = await getCurrentUser();

  const [plans, vipSettings] = await Promise.all([
    prisma.vipPricePlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { durationDays: "asc" }, { priceAmount: "asc" }],
    }),
    prisma.vipSettings.findUnique({
      where: { id: "global" },
      select: {
        isEnabled: true,
        lockFromEpisode: true,
      },
    }),
  ]);

  const vipLockFromEpisode = getVipLockStartEpisode(vipSettings);
  const userHasVip = isVipActive(user?.vipExpiresAt);
  const featuredPlan =
    plans.length > 0
      ? [...plans].sort((left, right) => {
          if (right.durationDays !== left.durationDays) {
            return right.durationDays - left.durationDays;
          }

          return left.priceAmount - right.priceAmount;
        })[0]
      : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <section className="relative mt-4 overflow-hidden rounded-[2.4rem] border border-amber-400/10 bg-[linear-gradient(180deg,#17110b_0%,#120d09_55%,#0f0a08_100%)] px-5 py-8 sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,178,42,0.14),transparent_34%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,122,69,0.12),transparent_28%)]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <Badge className="border-amber-400/20 bg-amber-500/10 px-4 py-1.5 text-amber-200">
            <Gem className="mr-2 size-3.5" />
            Premium membership
          </Badge>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
            Upgrade ke{" "}
            <span className="bg-[linear-gradient(180deg,#ffd56a,#ffb115)] bg-clip-text text-transparent">
              VIP Premium
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
            Buka episode premium, nikmati akses ke semua drama.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {userHasVip ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                <ShieldCheck className="size-4 text-emerald-300" />
                VIP aktif sampai{" "}
                {user?.vipExpiresAt
                  ? new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                    }).format(user.vipExpiresAt)
                  : "-"}
              </div>
            ) : vipLockFromEpisode ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                <Lock className="size-4 text-amber-300" />
                Episode premium terkunci mulai EP.{vipLockFromEpisode}
              </div>
            ) : null}
          </div>

        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {error ? (
          <div className="lg:col-span-3 rounded-[1.6rem] border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {plans.length > 0 ? (
          plans.map((plan) => {
            const isFeatured = featuredPlan?.id === plan.id;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden rounded-[2rem] border p-0",
                  isFeatured
                    ? "border-amber-400/40 bg-[linear-gradient(180deg,rgba(72,48,8,0.92),rgba(26,19,10,0.96))] shadow-[0_28px_80px_rgba(255,177,21,0.14)]"
                    : "glass-panel border-white/10",
                )}
              >
                {isFeatured ? (
                  <div className="absolute inset-x-0 top-0 bg-[linear-gradient(180deg,#ffcb4f,#f7ae14)] px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.24em] text-[#392100]">
                    Paling populer
                  </div>
                ) : null}

                <CardContent
                  className={cn("space-y-6 p-6", isFeatured && "pt-12")}
                >
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/45">
                      {plan.name}
                    </p>
                    <div>
                      <p className="text-5xl font-semibold tracking-tight text-white">
                        {formatIdr(plan.priceAmount, plan.currency)}
                      </p>
                      <p className="mt-2 text-sm text-white/56">
                        untuk {plan.durationDays} hari
                      </p>
                    </div>
                    {plan.description ? (
                      <p className="text-sm leading-6 text-white/66">
                        {plan.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 border-t border-white/8 pt-5">
                    {[
                      "Buka semua episode premium",
                      "Akses lebih cepat ke konten VIP",
                      "Kualitas stream terbaik",
                      "Checkout QRIS langsung otomatis",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-3 text-sm text-white/72"
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/8">
                          <BadgeCheck className="size-3.5 text-amber-300" />
                        </span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {user ? (
                    <form action={createVipCheckoutAction}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="next" value={next} />
                      <button
                        type="submit"
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "h-12 w-full rounded-2xl",
                          isFeatured &&
                            "bg-[linear-gradient(180deg,#ffd05a,#f4ae16)] text-[#392100] hover:brightness-105",
                        )}
                      >
                        <Crown className="mr-2 size-4" />
                        {userHasVip ? "Perpanjang VIP" : "Beli VIP sekarang"}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={`/sign-in?next=${encodeURIComponent(next)}`}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "h-12 w-full rounded-2xl",
                        isFeatured &&
                          "bg-[linear-gradient(180deg,#ffd05a,#f4ae16)] text-[#392100] hover:brightness-105",
                      )}
                    >
                      <Crown className="mr-2 size-4" />
                      Masuk untuk upgrade
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="glass-panel col-span-full rounded-[2rem] border-white/10">
            <CardContent className="space-y-4 p-8 text-center">
              <Badge className="mx-auto border-amber-400/20 bg-amber-500/10 text-amber-200">
                <Crown className="mr-2 size-3.5" />
                Paket VIP belum tersedia
              </Badge>
              <h2 className="text-2xl font-semibold text-white">
                Admin belum menambahkan paket VIP
              </h2>
              <p className="mx-auto max-w-xl text-sm leading-7 text-[var(--muted)]">
                Halaman upgrade sudah siap. Setelah paket ditambahkan dari dashboard
                admin, daftar harga VIP akan otomatis muncul di sini.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Kenapa VIP
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Akses episode premium tanpa batas
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard
                title="Episode premium"
                description="Konten yang dikunci admin mulai episode tertentu akan terbuka."
              />
              <FeatureCard
                title="Lebih nyaman"
                description="Siap untuk kualitas terbaik dan flow checkout yang lebih mulus."
              />
              <FeatureCard
                title="Dipakai lintas drama"
                description="Satu akun VIP akan jadi fondasi akses global di katalog."
              />
              <FeatureCard
                title="Siap payment gateway"
                description="Master pricing sudah dibangun agar mudah disambungkan ke checkout."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Langkah berikut
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Siapkan akunmu
              </h2>
            </div>

            <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
              <p>1. Masuk atau buat akun terlebih dahulu.</p>
              <p>2. Klik paket VIP yang paling cocok.</p>
              <p>3. QRIS akan langsung tampil dan status pembayaran dipantau otomatis.</p>
            </div>

            <div className="space-y-3">
              {user ? (
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/72">
                  Akunmu sudah siap untuk checkout VIP.
                </div>
              ) : (
                <>
                  <Link
                    href={`/sign-up?next=${encodeURIComponent(next)}`}
                    className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-2xl")}
                  >
                    Buat akun untuk VIP
                  </Link>
                  <Link
                    href={`/sign-in?next=${encodeURIComponent(next)}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "lg" }),
                      "h-12 w-full rounded-2xl",
                    )}
                  >
                    Sudah punya akun? Masuk
                  </Link>
                </>
              )}
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

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
