import { NextRequest, NextResponse } from "next/server";

import { extractGatewayPaymentDetailsFromPayloads } from "@/lib/payment-gateway-details";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";
import { syncVipPaymentStatus } from "@/lib/vip-payments";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/vip/transactions/[referenceId]">,
) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { referenceId } = await context.params;

  const synced = await syncVipPaymentStatus(referenceId, user.id).catch(() => null);
  const payment =
    synced ??
    (await prisma.vipPayment.findUnique({
      where: { referenceId },
      include: {
        plan: true,
      },
    }));

  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paymentDetails = extractGatewayPaymentDetailsFromPayloads(
    payment.gatewayProvider,
    payment.statusPayload,
    payment.providerPayload,
    payment.channelCode,
  );

  return NextResponse.json({
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
    channelName: payment.channelName || paymentDetails.channelName,
    channelGroup: paymentDetails.group,
    bankName: paymentDetails.bankName,
    vaNumber: paymentDetails.vaNumber,
  });
}
