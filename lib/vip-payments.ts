import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DEFAULT_AFFILIATE_SETTINGS, getAffiliateTier } from "@/lib/affiliate";
import {
  getPaymenkuChannelGroup,
  resolvePaymenkuEnabledChannelCodes,
} from "@/lib/paymenku";
import {
  checkGatewayTransactionStatus,
  createActiveGatewayTransaction,
} from "@/lib/payment-gateway-service";
import { getActivePaymentGateway } from "@/lib/payment-gateways";
import { notifyPartnerBotCommissionForPayment } from "@/lib/partner-bot-notifications";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  resolveSafeRedirectPath,
  resolveUserPaymentContactEmail,
} from "@/lib/user-auth";

const PAYMENKU_MINIMUM_QRIS_AMOUNT = 1000;
const PAYMENKU_MINIMUM_VA_AMOUNT = 20000;

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

async function createAffiliateCommissionForPaidPayment(
  tx: Pick<typeof prisma, "affiliateCommission" | "affiliateSettings" | "user">,
  payment: {
    id: string;
    userId: string;
    amount: number;
    referenceId: string;
    user: {
      referredById: string | null;
      referredByPartnerBotId: string | null;
    };
  },
) {
  if (!payment.user.referredById) {
    return;
  }

  const existingCommission = await tx.affiliateCommission.findUnique({
    where: { vipPaymentId: payment.id },
    select: { id: true },
  });

  if (existingCommission) {
    return;
  }

  const settings =
    (await tx.affiliateSettings.findUnique({
      where: { id: "global" },
    })) ?? DEFAULT_AFFILIATE_SETTINGS;

  if (!settings.isEnabled) {
    return;
  }

  const activeReferrals = await tx.user.count({
    where: {
      referredById: payment.user.referredById,
      vipPayments: {
        some: {
          status: "paid",
        },
      },
    },
  });
  const affiliateOwner = await tx.user.findUnique({
    where: {
      id: payment.user.referredById,
    },
    select: {
      affiliateCommissionOverrideRate: true,
    },
  });

  const tier = getAffiliateTier(activeReferrals, settings);
  const commissionRate =
    typeof affiliateOwner?.affiliateCommissionOverrideRate === "number"
      ? Math.min(Math.max(affiliateOwner.affiliateCommissionOverrideRate, 0), 100)
      : tier.rate;
  const commissionAmount = Math.floor(payment.amount * (commissionRate / 100));

  if (commissionAmount <= 0) {
    return;
  }

  await tx.affiliateCommission.create({
    data: {
      affiliateUserId: payment.user.referredById,
      referredUserId: payment.userId,
      vipPaymentId: payment.id,
      partnerBotId: payment.user.referredByPartnerBotId,
      baseAmount: payment.amount,
      commissionRate,
      amount: commissionAmount,
      description: `Komisi dari transaksi VIP ${payment.referenceId}`,
    },
  });
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
  const channelCode = String(input.channelCode).trim().toLowerCase();
  const activeGateway = await getActivePaymentGateway();

  const plan = await prisma.vipPricePlan.findFirst({
    where: {
      id: input.planId,
      isActive: true,
    },
  });

  if (!plan) {
    redirect(`/vip?error=${encodeURIComponent("Paket VIP tidak ditemukan.")}&next=${encodeURIComponent(safeNext)}`);
  }

  const enabledChannelCodes =
    activeGateway.provider === "paymenku"
      ? resolvePaymenkuEnabledChannelCodes(activeGateway.configJson)
      : [activeGateway.defaultChannelCode];

  if (!enabledChannelCodes.includes(channelCode)) {
    redirect(
      `/vip?error=${encodeURIComponent("Metode pembayaran tidak tersedia.")}&next=${encodeURIComponent(safeNext)}`,
    );
  }

  if (plan.priceAmount < PAYMENKU_MINIMUM_QRIS_AMOUNT) {
    redirect(
      `/vip?error=${encodeURIComponent(
        "Nominal paket terlalu kecil untuk checkout Paymenku. Minimum transaksi adalah Rp 1.000.",
      )}&next=${encodeURIComponent(safeNext)}`,
    );
  }

  if (
    getPaymenkuChannelGroup(channelCode) === "va" &&
    plan.priceAmount < PAYMENKU_MINIMUM_VA_AMOUNT
  ) {
    redirect(
      `/vip?error=${encodeURIComponent(
        "Minimal pembayaran dengan Virtual Account adalah Rp 20.000.",
      )}&next=${encodeURIComponent(safeNext)}`,
    );
  }

  const referenceId = buildReferenceId();
  const baseUrl = await getBaseUrl();
  const returnUrl = `${baseUrl}/vip/checkout/${referenceId}?next=${encodeURIComponent(safeNext)}`;

  const { gateway, result } = await createActiveGatewayTransaction({
    referenceId,
    amount: plan.priceAmount,
    customerName: user.name,
    customerEmail: resolveUserPaymentContactEmail(user),
    channelCode,
    returnUrl,
  });

  if (!result.payUrl) {
    throw new Error("Gateway pembayaran tidak mengembalikan pay_url.");
  }

  await prisma.vipPayment.create({
    data: {
      userId: user.id,
      vipPricePlanId: plan.id,
      referenceId,
      gatewayProvider: gateway.provider,
      providerTransactionId: result.providerTransactionId,
      channelCode: result.channelCode,
      channelName: result.channelName,
      amount: plan.priceAmount,
      paidAmount: result.amount,
      currency: plan.currency,
      status: result.status,
      payUrl: result.payUrl,
      qrUrl: result.qrUrl,
      qrString: result.qrString,
      returnUrl,
      expiresAt: result.expiresAt,
      providerPayload: result.providerPayload,
      lastCheckedAt: new Date(),
    },
  });

  return {
    referenceId,
    next: safeNext,
  };
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
          referredById: true,
          referredByPartnerBotId: true,
        },
      },
    },
  });

  if (!payment || payment.userId !== userId) {
    return null;
  }

  const payload = await checkGatewayTransactionStatus(
    payment.gatewayProvider as
      | "paymenku"
      | "xendit"
      | "midtrans"
      | "tripay"
      | "doku",
    payment.providerTransactionId || payment.referenceId,
  );

  const syncedPayment = await prisma.$transaction(async (tx) => {
    const latestPayment = await tx.vipPayment.findUnique({
      where: { id: payment.id },
      include: {
        user: {
          select: {
            id: true,
            vipExpiresAt: true,
            referredById: true,
            referredByPartnerBotId: true,
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
          payload.providerTransactionId || latestPayment.providerTransactionId,
        status: payload.status,
        paidAmount: payload.amount ?? latestPayment.paidAmount,
        payUrl: payload.payUrl || latestPayment.payUrl,
        qrUrl: payload.qrUrl || latestPayment.qrUrl,
        qrString: payload.qrString || latestPayment.qrString,
        expiresAt: payload.expiresAt ?? latestPayment.expiresAt,
        statusPayload: payload.providerPayload,
        lastCheckedAt: new Date(),
      },
    });

    if (payload.status === "paid" && !latestPayment.activatedAt) {
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

      await createAffiliateCommissionForPaidPayment(tx, latestPayment);
    }

    return tx.vipPayment.findUnique({
      where: { id: latestPayment.id },
      include: {
        plan: true,
      },
    });
  });

  if (syncedPayment?.status === "paid") {
    await notifyPartnerBotCommissionForPayment(payment.id);
  }

  return syncedPayment;
}
