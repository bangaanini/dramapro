import { NextRequest, NextResponse } from "next/server";

import { checkGatewayTransactionStatus } from "@/lib/payment-gateway-service";
import { listPaymentGatewayConfigs } from "@/lib/payment-gateways";
import { normalizePakasirStatus, parsePakasirAmount } from "@/lib/pakasir";
import { prisma } from "@/lib/prisma";
import { applyVipPaymentGatewayResult } from "@/lib/vip-payments";

export const runtime = "nodejs";

type PakasirWebhookPayload = {
  amount: number;
  order_id: string;
  project: string;
  status: string;
  payment_method: string;
  completed_at?: string;
};

export async function POST(request: NextRequest) {
  let payload: PakasirWebhookPayload;

  try {
    payload = (await request.json()) as PakasirWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.order_id || !payload.amount || !payload.project || !payload.status) {
    return NextResponse.json({ error: "Bad Parameter" }, { status: 400 });
  }

  const gateway = (await listPaymentGatewayConfigs()).find(
    (config) => config.provider === "pakasir",
  );

  if (!gateway?.secret || !gateway.merchantId) {
    return NextResponse.json(
      { error: "Pakasir gateway belum dikonfigurasi." },
      { status: 500 },
    );
  }

  if (payload.project !== gateway.merchantId) {
    return NextResponse.json({ error: "Project slug tidak valid." }, { status: 401 });
  }

  const payment = await prisma.vipPayment.findUnique({
    where: { referenceId: payload.order_id },
    select: {
      id: true,
      gatewayProvider: true,
      amount: true,
    },
  });

  if (!payment || payment.gatewayProvider !== "pakasir") {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const normalizedStatus = normalizePakasirStatus(payload.status);

  let statusResult;
  if (normalizedStatus === "paid") {
    statusResult = {
      providerTransactionId: payload.order_id,
      amount: parsePakasirAmount(payload.amount),
      status: "paid" as const,
      payUrl: null,
      qrUrl: null,
      qrString: null,
      expiresAt: null,
      providerPayload: payload,
    };
  } else {
    try {
      statusResult = await checkGatewayTransactionStatus("pakasir", payload.order_id, payment.amount);
    } catch {
      statusResult = {
        providerTransactionId: payload.order_id,
        amount: parsePakasirAmount(payload.amount),
        status: normalizedStatus,
        payUrl: null,
        qrUrl: null,
        qrString: null,
        expiresAt: null,
        providerPayload: payload,
      };
    }
  }

  await applyVipPaymentGatewayResult(payment.id, statusResult);

  return NextResponse.json({ ok: true });
}
