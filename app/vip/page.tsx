import Link from "next/link";
import {
  BadgeCheck,
  Crown,
  Gem,
  ShieldCheck,
} from "lucide-react";

import { createVipCheckoutAction } from "@/app/vip/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";
import { cn } from "@/lib/utils";
import { isVipActive } from "@/lib/vip";

export const dynamic = "force-dynamic";

export default async function VipPage(props: PageProps<"/vip">) {
  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/vip",
  );
  const user = await getCurrentUser();

  const plans = await prisma.vipPricePlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { durationDays: "asc" }, { priceAmount: "asc" }],
  });

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
    <main className="route-transition-shell mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">

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
                      <FormSubmitButton
                        type="submit"
                        size="lg"
                        pendingLabel="Menyiapkan QRIS..."
                        idleLabel={userHasVip ? "Perpanjang VIP" : "Beli VIP sekarang"}
                        className={cn(
                          "h-12 w-full rounded-2xl",
                          isFeatured &&
                            "bg-[linear-gradient(180deg,#ffd05a,#f4ae16)] text-[#392100] hover:brightness-105",
                        )}
                      >
                        <Crown className="mr-2 size-4" />
                        {userHasVip ? "Perpanjang VIP" : "Beli VIP sekarang"}
                      </FormSubmitButton>
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
            </CardContent>
          </Card>
        )}
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
