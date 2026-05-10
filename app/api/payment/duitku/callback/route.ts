import { NextRequest, NextResponse } from "next/server";

import {
  normalizeDuitkuCallbackStatus,
  parseDuitkuAmount,
  parseDuitkuCallbackPayload,
  verifyDuitkuCallbackSignature,
} from "@/lib/duitku";
import { checkGatewayTransactionStatus } from "@/lib/payment-gateway-service";
import { listPaymentGatewayConfigs } from "@/lib/payment-gateways";
import { prisma } from "@/lib/prisma";
import { applyVipPaymentGatewayResult } from "@/lib/vip-payments";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payload = parseDuitkuCallbackPayload(formData);

  if (
    !payload.merchantCode ||
    !payload.amount ||
    !payload.merchantOrderId ||
    !payload.signature
  ) {
    return NextResponse.json({ error: "Bad Parameter" }, { status: 400 });
  }

  const gateway = (await listPaymentGatewayConfigs()).find(
    (config) => config.provider === "duitku",
  );

  if (!gateway?.secret || !gateway.merchantId) {
    return NextResponse.json(
      { error: "Duitku gateway belum dikonfigurasi." },
      { status: 500 },
    );
  }

  if (payload.merchantCode !== gateway.merchantId) {
    return NextResponse.json({ error: "Merchant Code tidak valid." }, { status: 401 });
  }

  if (!verifyDuitkuCallbackSignature(payload, gateway.secret)) {
    return NextResponse.json({ error: "Bad Signature" }, { status: 401 });
  }

  const payment = await prisma.vipPayment.findUnique({
    where: { referenceId: payload.merchantOrderId },
    select: {
      id: true,
      gatewayProvider: true,
    },
  });

  if (!payment || payment.gatewayProvider !== "duitku") {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const statusResult =
    payload.resultCode === "00"
      ? await checkGatewayTransactionStatus("duitku", payload.merchantOrderId)
      : {
          providerTransactionId: payload.reference || null,
          amount: parseDuitkuAmount(payload.amount),
          status: normalizeDuitkuCallbackStatus(payload.resultCode),
          payUrl: null,
          qrUrl: null,
          qrString: null,
          expiresAt: null,
          providerPayload: payload,
        };

  await applyVipPaymentGatewayResult(payment.id, statusResult);

  return NextResponse.json({ ok: true });
}
