
import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";
import { VipCheckoutPanel } from "@/components/vip-checkout-panel";
import { extractPaymenkuPaymentDetails } from "@/lib/paymenku";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";
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

  const providerPayload =
    (payment.statusPayload as Record<string, unknown> | null) ??
    (payment.providerPayload as Record<string, unknown> | null);
  const paymenkuDetails = extractPaymenkuPaymentDetails(
    providerPayload as Parameters<typeof extractPaymenkuPaymentDetails>[0],
    payment.channelCode,
  );

  const qrDataUrl =
    !payment.qrUrl && payment.qrString
      ? await QRCode.toDataURL(payment.qrString, {
          margin: 1,
          width: 640,
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
        }).catch(() => null)
      : null;

  return (
    <main className="route-transition-shell mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">


      <VipCheckoutPanel
        nextHref={next}
        initialQrDataUrl={qrDataUrl}
        initialPayment={{
          referenceId: payment.referenceId,
          status: payment.status,
          payUrl: payment.payUrl,
          qrUrl: payment.qrUrl,
          qrString: payment.qrString,
          expiresAt: payment.expiresAt?.toISOString() ?? null,
          activatedAt: payment.activatedAt?.toISOString() ?? null,
          amount: payment.paidAmount ?? payment.amount,
          currency: payment.currency,
          planName: payment.plan.name,
          channelCode: payment.channelCode,
          channelName: payment.channelName || paymenkuDetails.channelName,
          channelGroup: paymenkuDetails.group,
          bankName: paymenkuDetails.bankName,
          vaNumber: paymenkuDetails.vaNumber,
        }}
      />
    </main>
  );
}
