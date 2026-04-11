import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  checkPaymenkuTransactionStatus,
  createPaymenkuTransaction,
  normalizePaymenkuStatus,
  parsePaymenkuAmount,
} from "@/lib/paymenku";
import { getCurrentUser, resolveSafeRedirectPath } from "@/lib/user-auth";

function buildReferenceId() {
  return `VIP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function getBaseUrl() {
  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";

  return `${proto}://${host}`;
}

export async function requireSignedInVipUser(next: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  return user;
}

export async function createVipPaymentSession(input: {
  planId: string;
  channelCode: string;
  next: string;
}) {
  const safeNext = resolveSafeRedirectPath(input.next);
  const user = await requireSignedInVipUser(`/vip?next=${safeNext}`);

  const plan = await prisma.vipPricePlan.findFirst({
    where: {
      id: input.planId,
      isActive: true,
    },
  });

  if (!plan) {
    redirect(`/vip?error=${encodeURIComponent("Paket VIP tidak ditemukan.")}&next=${encodeURIComponent(safeNext)}`);
  }

  const referenceId = buildReferenceId();
  const baseUrl = await getBaseUrl();
  const returnUrl = `${baseUrl}/vip/checkout/${referenceId}?next=${encodeURIComponent(safeNext)}`;

  const payload = await createPaymenkuTransaction({
    reference_id: referenceId,
    amount: plan.priceAmount,
    customer_name: user.name,
    customer_email: user.email,
    channel_code: input.channelCode,
    return_url: returnUrl,
  });

  if (!payload.data?.pay_url) {
    throw new Error(payload.message || "Paymenku tidak mengembalikan pay_url.");
  }

  await prisma.vipPayment.create({
    data: {
      userId: user.id,
      vipPricePlanId: plan.id,
      referenceId,
      providerTransactionId: payload.data.trx_id,
      channelCode: input.channelCode,
      channelName: input.channelCode.toUpperCase(),
      amount: plan.priceAmount,
      paidAmount: parsePaymenkuAmount(payload.data.amount),
      currency: plan.currency,
      status: normalizePaymenkuStatus(
        payload.data.payment_info?.transaction_status ?? payload.data.status,
      ),
      payUrl: payload.data.pay_url,
      qrUrl: payload.data.payment_info?.qr_url,
      qrString: payload.data.payment_info?.qr_string,
      returnUrl,
      expiresAt: payload.data.payment_info?.expiration_date
        ? new Date(payload.data.payment_info.expiration_date)
        : null,
      providerPayload: payload as unknown as object,
      lastCheckedAt: new Date(),
    },
  });

  redirect(`/vip/checkout/${referenceId}?next=${encodeURIComponent(safeNext)}`);
}

export async function syncVipPaymentStatus(referenceId: string, userId: string) {
  const payment = await prisma.vipPayment.findUnique({
    where: { referenceId },
    include: {
      plan: true,
      user: {
        select: {
          id: true,
          vipExpiresAt: true,
        },
      },
    },
  });

  if (!payment || payment.userId !== userId) {
    return null;
  }

  const payload = await checkPaymenkuTransactionStatus(
    payment.providerTransactionId || payment.referenceId,
  );

  const nextStatus = normalizePaymenkuStatus(
    payload.data?.payment_info?.transaction_status ?? payload.data?.status,
  );
  const nextPaidAmount = parsePaymenkuAmount(payload.data?.amount);
  const expiresAt = payload.data?.payment_info?.expiration_date
    ? new Date(payload.data.payment_info.expiration_date)
    : payment.expiresAt;

  return prisma.$transaction(async (tx) => {
    const latestPayment = await tx.vipPayment.findUnique({
      where: { id: payment.id },
      include: {
        user: {
          select: {
            id: true,
            vipExpiresAt: true,
          },
        },
        plan: true,
      },
    });

    if (!latestPayment) {
      return null;
    }

    await tx.vipPayment.update({
      where: { id: latestPayment.id },
      data: {
        providerTransactionId:
          payload.data?.trx_id || latestPayment.providerTransactionId,
        status: nextStatus,
        paidAmount: nextPaidAmount ?? latestPayment.paidAmount,
        payUrl: payload.data?.pay_url || latestPayment.payUrl,
        qrUrl: payload.data?.payment_info?.qr_url || latestPayment.qrUrl,
        qrString: payload.data?.payment_info?.qr_string || latestPayment.qrString,
        expiresAt,
        statusPayload: payload as unknown as object,
        lastCheckedAt: new Date(),
      },
    });

    if (nextStatus === "paid" && !latestPayment.activatedAt) {
      const now = new Date();
      const currentExpiry =
        latestPayment.user.vipExpiresAt &&
        latestPayment.user.vipExpiresAt.getTime() > now.getTime()
          ? latestPayment.user.vipExpiresAt
          : now;
      const nextExpiry = new Date(currentExpiry);
      nextExpiry.setDate(nextExpiry.getDate() + latestPayment.plan.durationDays);

      await tx.user.update({
        where: { id: latestPayment.user.id },
        data: {
          vipStartedAt: latestPayment.user.vipExpiresAt ? undefined : now,
          vipExpiresAt: nextExpiry,
        },
      });

      await tx.vipPayment.update({
        where: { id: latestPayment.id },
        data: {
          activatedAt: now,
        },
      });
    }

    return tx.vipPayment.findUnique({
      where: { id: latestPayment.id },
      include: {
        plan: true,
      },
    });
  });
}
