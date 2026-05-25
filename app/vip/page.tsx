import QRCode from "qrcode";
import Link from "next/link";
import { Crown, X } from "lucide-react";
import { redirect } from "next/navigation";

import { VipCheckoutPanel } from "@/components/vip-checkout-panel";
import { VipPaymentSelector } from "@/components/vip-payment-selector";
import { getDuitkuCheckoutChannels } from "@/lib/duitku";
import { getPakasirCheckoutChannels } from "@/lib/pakasir";
import {
  getPaymenkuCheckoutChannels,
  PAYMENKU_PRIMARY_CHANNELS,
} from "@/lib/paymenku";
import { extractGatewayPaymentDetailsFromPayloads } from "@/lib/payment-gateway-details";
import { getActivePaymentGateway } from "@/lib/payment-gateways";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";
import { isVipActive } from "@/lib/vip";

export const dynamic = "force-dynamic";

export default async function VipPage(props: PageProps<"/vip">) {
  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;
  const checkoutReferenceId =
    typeof searchParams.checkout === "string" ? searchParams.checkout : null;
  const selectedPlanId =
    typeof searchParams.plan === "string" ? searchParams.plan : null;
  const next = resolveSafeRedirectPath(
    typeof searchParams.next === "string" ? searchParams.next : "/vip",
  );
  const user = await getCurrentUser();

  if (checkoutReferenceId && !user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/vip?checkout=${checkoutReferenceId}&next=${encodeURIComponent(next)}`)}`);
  }
  const activeGateway = await getActivePaymentGateway().catch(() => null);
  const availableChannels =
    activeGateway?.provider === "paymenku"
      ? getPaymenkuCheckoutChannels(activeGateway.configJson)
      : activeGateway?.provider === "duitku"
        ? getDuitkuCheckoutChannels(activeGateway.configJson)
      : activeGateway?.provider === "pakasir"
        ? getPakasirCheckoutChannels(activeGateway.configJson)
      : PAYMENKU_PRIMARY_CHANNELS;
  const checkoutPayment =
    checkoutReferenceId && user
      ? await prisma.vipPayment.findUnique({
          where: { referenceId: checkoutReferenceId },
          include: { plan: true },
        })
      : null;

  const resolvedCheckoutPayment =
    checkoutPayment && user && checkoutPayment.userId === user.id
      ? checkoutPayment
      : null;
  const paymentDetails = resolvedCheckoutPayment
    ? extractGatewayPaymentDetailsFromPayloads(
        resolvedCheckoutPayment.gatewayProvider,
        resolvedCheckoutPayment.statusPayload,
        resolvedCheckoutPayment.providerPayload,
        resolvedCheckoutPayment.channelCode,
      )
    : null;
  const qrDataUrl =
    resolvedCheckoutPayment &&
    !resolvedCheckoutPayment.qrUrl &&
    resolvedCheckoutPayment.qrString
      ? await QRCode.toDataURL(resolvedCheckoutPayment.qrString, {
          margin: 1,
          width: 640,
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
        }).catch(() => null)
      : null;

  const plans = await prisma.vipPricePlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { durationDays: "asc" }, { priceAmount: "asc" }],
  });

  const userHasVip = isVipActive(user?.vipExpiresAt);
  return (
    <main className="route-transition-shell relative min-h-screen overflow-hidden bg-[#020205] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,66,74,0.16),transparent_30%),radial-gradient(circle_at_92%_32%,rgba(50,92,255,0.15),transparent_28%),linear-gradient(180deg,#030412_0%,#020205_72%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/72 to-transparent" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-5 sm:px-6">
        <div className="w-full max-w-[560px]">
          {error ? (
            <div className="mb-3 rounded-[1.1rem] border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
              {error}
            </div>
          ) : null}

          {plans.length > 0 ? (
            <VipPaymentSelector
              plans={plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                description: plan.description,
                badgeText: plan.badgeText,
                badgeColor: plan.badgeColor,
                durationDays: plan.durationDays,
                priceAmount: plan.priceAmount,
                currency: plan.currency,
              }))}
              next={next}
              userHasVip={userHasVip}
              initialPlanId={selectedPlanId}
              channels={availableChannels}
            />
          ) : (
            <div className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#050719]/98 px-5 py-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:rounded-[1.8rem] sm:px-8">
              <Link
                href={next}
                className="absolute left-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.025] text-white/48 transition hover:bg-white/8 hover:text-white"
                aria-label="Tutup halaman VIP"
              >
                <X className="size-5" />
              </Link>
              <div className="mx-auto flex size-[4.5rem] items-center justify-center rounded-full bg-red-500/12 text-red-300 shadow-[0_0_46px_rgba(255,55,71,0.26)] ring-1 ring-red-400/10">
                <Crown className="size-9" strokeWidth={2.4} />
              </div>
              <h1 className="mt-5 text-2xl font-semibold text-white">
                Paket VIP belum tersedia
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/52">
                Admin belum menambahkan paket VIP. Silakan cek kembali nanti.
              </p>
            </div>
          )}
        </div>
      </section>

      {resolvedCheckoutPayment && paymentDetails ? (
        <VipCheckoutPanel
          presentation="sheet"
          closeHref={`/vip?next=${encodeURIComponent(next)}`}
          nextHref={next}
          initialQrDataUrl={qrDataUrl}
          initialPayment={{
            referenceId: resolvedCheckoutPayment.referenceId,
            status: resolvedCheckoutPayment.status,
            payUrl: resolvedCheckoutPayment.payUrl,
            qrUrl: resolvedCheckoutPayment.qrUrl,
            qrString: resolvedCheckoutPayment.qrString,
            expiresAt: resolvedCheckoutPayment.expiresAt?.toISOString() ?? null,
            activatedAt: resolvedCheckoutPayment.activatedAt?.toISOString() ?? null,
            amount: resolvedCheckoutPayment.paidAmount ?? resolvedCheckoutPayment.amount,
            currency: resolvedCheckoutPayment.currency,
            planName: resolvedCheckoutPayment.plan.name,
            channelCode: resolvedCheckoutPayment.channelCode,
            channelName:
              resolvedCheckoutPayment.channelName || paymentDetails.channelName,
            channelGroup: paymentDetails.group,
            bankName: paymentDetails.bankName,
            vaNumber: paymentDetails.vaNumber,
          }}
        />
      ) : null}
    </main>
  );
}
