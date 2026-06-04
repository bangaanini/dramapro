import { NextRequest, NextResponse } from "next/server";

import { extractGatewayPaymentDetailsFromPayloads } from "@/lib/payment-gateway-details";
import { parsePakasirAmount } from "@/lib/pakasir";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/user-auth";
import { syncVipPaymentStatus } from "@/lib/vip-payments";

function extractPakasirTotalPayment(
  provider: string,
  providerPayload: unknown,
) {
  if (provider !== "pakasir" || !providerPayload) {
    return null;
  }

  const payload = providerPayload as Record<string, unknown> | null | undefined;

  if (!payload) {
    return null;
  }

  const payment = payload.payment as Record<string, unknown> | null | undefined;
  const transaction = payload.transaction as Record<string, unknown> | null | undefined;
  const totalPayment = payment?.total_payment ?? transaction?.amount;

  return parsePakasirAmount(
    typeof totalPayment === "string" || typeof totalPayment === "number"
      ? totalPayment
      : null,
  );
}

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

  const resolvedPaidAmount =
    payment.paidAmount ?? extractPakasirTotalPayment(payment.gatewayProvider, payment.providerPayload) ?? payment.amount;

  return NextResponse.json({
    referenceId: payment.referenceId,
    status: payment.status,
    payUrl: payment.payUrl,
    qrUrl: payment.qrUrl,
    qrString: payment.qrString,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    activatedAt: payment.activatedAt?.toISOString() ?? null,
    amount: resolvedPaidAmount,
    currency: payment.currency,
    planName: payment.plan.name,
    channelCode: payment.channelCode,
    channelName: payment.channelName || paymentDetails.channelName,
    channelGroup: paymentDetails.group,
    bankName: paymentDetails.bankName,
    vaNumber: paymentDetails.vaNumber,
  });
}
