import { Prisma } from "@/app/generated/prisma/client";
import {
  calculateAffiliateAvailableBalance,
  getAffiliateSettings,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";

export type PartnerBotRevenueRange = "7d" | "30d";

type RevenueSummaryRow = {
  revenue: number | bigint | null;
  transactions: number | bigint | null;
};

type RevenuePlanRow = {
  planId: string;
  name: string;
  slug: string;
  transactions: number | bigint;
  revenue: number | bigint | null;
};

type PaymentMethodRow = {
  method: string | null;
  transactions: number | bigint;
  revenue: number | bigint | null;
};

type RecentTransactionRow = {
  id: string;
  referenceId: string;
  userName: string;
  userEmail: string | null;
  telegramUsername: string | null;
  planName: string;
  channelCode: string;
  channelName: string;
  amount: number;
  paidAmount: number | null;
  status: string;
  paidAt: Date;
};

const RANGE_OPTIONS: Array<{
  key: PartnerBotRevenueRange;
  label: string;
  days: number;
}> = [
  { key: "7d", label: "7 hari", days: 7 },
  { key: "30d", label: "30 hari", days: 30 },
];

function toNumber(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return value ?? 0;
}

function getPaidAtSql(alias = "vp") {
  const prefix = Prisma.raw(`${alias}.`);
  return Prisma.sql`COALESCE(${prefix}"activatedAt", ${prefix}"updatedAt", ${prefix}"createdAt")`;
}

function calculateDelta(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function parsePartnerBotRevenueRange(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (
    RANGE_OPTIONS.find((option) => option.key === candidate) ??
    RANGE_OPTIONS[0]
  );
}

async function getRevenueSummary(input: {
  partnerBotId: string;
  since: Date;
  until: Date;
}) {
  const paidAtSql = getPaidAtSql();
  const rows = await prisma.$queryRaw<RevenueSummaryRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(COALESCE(vp."paidAmount", vp."amount")), 0)::bigint AS "revenue",
      COUNT(*)::int AS "transactions"
    FROM "VipPayment" vp
    JOIN "User" u ON u."id" = vp."userId"
    WHERE vp."status" = 'paid'
      AND u."referredByPartnerBotId" = ${input.partnerBotId}
      AND ${paidAtSql} >= ${input.since}
      AND ${paidAtSql} < ${input.until}
  `);
  const row = rows[0];

  return {
    revenue: toNumber(row?.revenue),
    transactions: toNumber(row?.transactions),
  };
}

export async function getPartnerBotRevenueDashboard(input: {
  partnerBotId: string;
  range?: string | string[];
}) {
  const range = parsePartnerBotRevenueRange(input.range);
  const now = new Date();
  const since = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
  const previousSince = new Date(
    since.getTime() - range.days * 24 * 60 * 60 * 1000,
  );
  const paidAtSql = getPaidAtSql();

  const [
    currentSummary,
    previousSummary,
    commissionSummary,
    activeVipUsers,
    planRows,
    methodRows,
    recentRows,
  ] = await Promise.all([
    getRevenueSummary({ partnerBotId: input.partnerBotId, since, until: now }),
    getRevenueSummary({
      partnerBotId: input.partnerBotId,
      since: previousSince,
      until: since,
    }),
    prisma.affiliateCommission.aggregate({
      where: {
        partnerBotId: input.partnerBotId,
        status: {
          not: "cancelled",
        },
        createdAt: {
          gte: since,
          lt: now,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.user.count({
      where: {
        referredByPartnerBotId: input.partnerBotId,
        vipExpiresAt: {
          gt: now,
        },
      },
    }),
    prisma.$queryRaw<RevenuePlanRow[]>(Prisma.sql`
      SELECT
        plan."id"::text AS "planId",
        plan."name" AS "name",
        plan."slug" AS "slug",
        COUNT(vp."id")::int AS "transactions",
        COALESCE(SUM(COALESCE(vp."paidAmount", vp."amount")), 0)::bigint AS "revenue"
      FROM "VipPayment" vp
      JOIN "User" u ON u."id" = vp."userId"
      JOIN "VipPricePlan" plan ON plan."id" = vp."vipPricePlanId"
      WHERE vp."status" = 'paid'
        AND u."referredByPartnerBotId" = ${input.partnerBotId}
        AND ${paidAtSql} >= ${since}
        AND ${paidAtSql} < ${now}
      GROUP BY plan."id", plan."name", plan."slug"
      ORDER BY "revenue" DESC, "transactions" DESC, plan."name" ASC
      LIMIT 8
    `),
    prisma.$queryRaw<PaymentMethodRow[]>(Prisma.sql`
      SELECT
        COALESCE(NULLIF(vp."channelName", ''), NULLIF(vp."channelCode", ''), 'unknown') AS "method",
        COUNT(*)::int AS "transactions",
        COALESCE(SUM(COALESCE(vp."paidAmount", vp."amount")), 0)::bigint AS "revenue"
      FROM "VipPayment" vp
      JOIN "User" u ON u."id" = vp."userId"
      WHERE vp."status" = 'paid'
        AND u."referredByPartnerBotId" = ${input.partnerBotId}
        AND ${paidAtSql} >= ${since}
        AND ${paidAtSql} < ${now}
      GROUP BY 1
      ORDER BY "revenue" DESC, "transactions" DESC, "method" ASC
      LIMIT 8
    `),
    prisma.$queryRaw<RecentTransactionRow[]>(Prisma.sql`
      SELECT
        vp."id"::text AS "id",
        vp."referenceId" AS "referenceId",
        u."name" AS "userName",
        u."email" AS "userEmail",
        u."telegramUsername" AS "telegramUsername",
        plan."name" AS "planName",
        vp."channelCode" AS "channelCode",
        vp."channelName" AS "channelName",
        vp."amount" AS "amount",
        vp."paidAmount" AS "paidAmount",
        vp."status"::text AS "status",
        ${paidAtSql} AS "paidAt"
      FROM "VipPayment" vp
      JOIN "User" u ON u."id" = vp."userId"
      JOIN "VipPricePlan" plan ON plan."id" = vp."vipPricePlanId"
      WHERE vp."status" = 'paid'
        AND u."referredByPartnerBotId" = ${input.partnerBotId}
        AND ${paidAtSql} >= ${since}
        AND ${paidAtSql} < ${now}
      ORDER BY ${paidAtSql} DESC
      LIMIT 20
    `),
  ]);

  const averageTransaction =
    currentSummary.transactions > 0
      ? Math.round(currentSummary.revenue / currentSummary.transactions)
      : 0;
  const totalRevenue = currentSummary.revenue;

  return {
    filters: {
      range,
      rangeOptions: RANGE_OPTIONS,
    },
    stats: {
      totalRevenue,
      transactions: currentSummary.transactions,
      totalCommission: commissionSummary._sum.amount ?? 0,
      activeVipUsers,
      averageTransaction,
      deltas: {
        totalRevenue: calculateDelta(totalRevenue, previousSummary.revenue),
        transactions: calculateDelta(
          currentSummary.transactions,
          previousSummary.transactions,
        ),
      },
    },
    revenueByPlan: planRows.map((row) => {
      const revenue = toNumber(row.revenue);

      return {
        planId: row.planId,
        name: row.name,
        slug: row.slug,
        transactions: toNumber(row.transactions),
        revenue,
        percentage:
          totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
      };
    }),
    paymentMethods: methodRows.map((row) => {
      const revenue = toNumber(row.revenue);
      const method = row.method?.trim() || "unknown";

      return {
        method: method === "unknown" ? "Unknown" : method,
        transactions: toNumber(row.transactions),
        revenue,
        percentage:
          totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
      };
    }),
    recentTransactions: recentRows.map((row) => ({
      id: row.id,
      referenceId: row.referenceId,
      userLabel:
        row.userEmail ||
        (row.telegramUsername ? `@${row.telegramUsername}` : row.userName),
      planName: row.planName,
      method: row.channelName || row.channelCode || "unknown",
      amount: row.paidAmount ?? row.amount,
      status: row.status,
      paidAt: row.paidAt.toISOString(),
    })),
    generatedAt: now.toISOString(),
  };
}

export async function getPartnerBotBalanceDashboard(input: {
  ownerUserId: string;
  partnerBotId: string;
  balanceView?: string | string[];
}) {
  const balanceView = Array.isArray(input.balanceView)
    ? input.balanceView[0]
    : input.balanceView;
  const activeView =
    balanceView === "history" || balanceView === "ledger"
      ? balanceView
      : "overview";
  const [settings, payoutProfile, commissionTotals, withdrawalTotals, latestPayment, latestWithdrawal, recentWithdrawals, recentCommissions] =
    await Promise.all([
      getAffiliateSettings(),
      prisma.affiliatePayoutProfile.findUnique({
        where: {
          userId: input.ownerUserId,
        },
      }),
      prisma.affiliateCommission.groupBy({
        by: ["status"],
        where: {
          affiliateUserId: input.ownerUserId,
          partnerBotId: input.partnerBotId,
        },
        _sum: {
          amount: true,
          baseAmount: true,
        },
      }),
      prisma.affiliateWithdrawal.groupBy({
        by: ["status"],
        where: {
          affiliateUserId: input.ownerUserId,
          partnerBotId: input.partnerBotId,
        },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.affiliateCommission.findFirst({
        where: {
          affiliateUserId: input.ownerUserId,
          partnerBotId: input.partnerBotId,
          status: {
            not: "cancelled",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      }),
      prisma.affiliateWithdrawal.findFirst({
        where: {
          affiliateUserId: input.ownerUserId,
          partnerBotId: input.partnerBotId,
        },
        orderBy: {
          requestedAt: "desc",
        },
        select: {
          requestedAt: true,
          reviewedAt: true,
        },
      }),
      prisma.affiliateWithdrawal.findMany({
        where: {
          affiliateUserId: input.ownerUserId,
          partnerBotId: input.partnerBotId,
        },
        orderBy: {
          requestedAt: "desc",
        },
        take: 12,
      }),
      prisma.affiliateCommission.findMany({
        where: {
          affiliateUserId: input.ownerUserId,
          partnerBotId: input.partnerBotId,
        },
        include: {
          referredUser: {
            select: {
              name: true,
              email: true,
              telegramUsername: true,
            },
          },
          vipPayment: {
            include: {
              plan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      }),
    ]);
  const totalCommission = commissionTotals.reduce((sum, item) => {
    if (item.status === "cancelled") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);
  const totalBaseAmount = commissionTotals.reduce((sum, item) => {
    if (item.status === "cancelled") {
      return sum;
    }

    return sum + (item._sum.baseAmount ?? 0);
  }, 0);
  const totalWithdrawn = withdrawalTotals.reduce((sum, item) => {
    if (item.status !== "approved" && item.status !== "paid") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);
  const totalReserved = withdrawalTotals.reduce((sum, item) => {
    if (item.status !== "pending") {
      return sum;
    }

    return sum + (item._sum.amount ?? 0);
  }, 0);
  const pendingWithdrawals = withdrawalTotals.reduce((sum, item) => {
    if (item.status !== "pending") {
      return sum;
    }

    return sum + item._count._all;
  }, 0);
  const availableBalance = calculateAffiliateAvailableBalance({
    totalCommission,
    totalWithdrawn,
    totalReserved,
  });

  return {
    activeView,
    settings,
    hasPayoutProfile: Boolean(payoutProfile),
    stats: {
      availableBalance,
      pendingBalance: totalReserved,
      withdrawableBalance: availableBalance,
      withdrawnBalance: totalWithdrawn,
      totalReceived: totalCommission,
      platformFees: Math.max(0, totalBaseAmount - totalCommission),
      pendingWithdrawals,
      lastPaymentAt: latestPayment?.createdAt.toISOString() ?? null,
      lastWithdrawalAt:
        (latestWithdrawal?.reviewedAt ?? latestWithdrawal?.requestedAt)?.toISOString() ??
        null,
    },
    recentWithdrawals: recentWithdrawals.map((item) => ({
      id: item.id,
      amount: item.amount,
      status: item.status,
      requestedAt: item.requestedAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
    })),
    ledger: recentCommissions.map((item) => ({
      id: item.id,
      amount: item.amount,
      baseAmount: item.baseAmount,
      commissionRate: item.commissionRate,
      status: item.status,
      description: item.description,
      userLabel:
        item.referredUser.email ||
        (item.referredUser.telegramUsername
          ? `@${item.referredUser.telegramUsername}`
          : item.referredUser.name),
      planName: item.vipPayment.plan.name,
      createdAt: item.createdAt.toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  };
}
