import {
  Crown,
  Gem,
  ShieldCheck,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { VipPaymentSelector } from "@/components/vip-payment-selector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PAYMENKU_PRIMARY_CHANNELS } from "@/lib/paymenku";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";
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

      <section className="mt-8">
        {error ? (
          <div className="mb-5 rounded-[1.6rem] border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {plans.length > 0 ? (
          <VipPaymentSelector
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              description: plan.description,
              durationDays: plan.durationDays,
              priceAmount: plan.priceAmount,
              currency: plan.currency,
            }))}
            next={next}
            userHasVip={userHasVip}
            channels={PAYMENKU_PRIMARY_CHANNELS}
          />
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
