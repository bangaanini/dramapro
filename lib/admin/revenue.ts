import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminRevenueRange = "7d" | "30d";
export type AdminPartnerRevenueSort = "highest" | "lowest";

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

type PartnerBotRevenueRow = {
  partnerBotId: string;
  botUsername: string;
  isEnabled: boolean;
  ownerName: string;
  ownerEmail: string | null;
  ownerTelegramUsername: string | null;
  referredUsers: number | bigint | null;
  activeVipUsers: number | bigint | null;
  transactions: number | bigint | null;
  revenue: number | bigint | null;
  commission: number | bigint | null;
  lastPaidAt: Date | null;
};

const RANGE_OPTIONS: Array<{
  key: AdminRevenueRange;
  label: string;
  days: number;
}> = [
  { key: "7d", label: "7 hari", days: 7 },
  { key: "30d", label: "30 hari", days: 30 },
];

const PARTNER_REVENUE_SORT_OPTIONS: Array<{
  key: AdminPartnerRevenueSort;
  label: string;
}> = [
  { key: "highest", label: "Penghasilan tertinggi" },
  { key: "lowest", label: "Penghasilan terendah" },
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

export function parseAdminRevenueRange(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (
    RANGE_OPTIONS.find((option) => option.key === candidate) ??
    RANGE_OPTIONS[0]
  );
}

export function parseAdminPartnerRevenueSort(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (
    PARTNER_REVENUE_SORT_OPTIONS.find((option) => option.key === candidate) ??
    PARTNER_REVENUE_SORT_OPTIONS[0]
  );
}

async function getRevenueSummary(input: { since: Date; until: Date }) {
  const paidAtSql = getPaidAtSql();
  const rows = await prisma.$queryRaw<RevenueSummaryRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(COALESCE(vp."paidAmount", vp."amount")), 0)::bigint AS "revenue",
      COUNT(*)::int AS "transactions"
    FROM "VipPayment" vp
    WHERE vp."status" = 'paid'
      AND ${paidAtSql} >= ${input.since}
      AND ${paidAtSql} < ${input.until}
  `);
  const row = rows[0];

  return {
    revenue: toNumber(row?.revenue),
    transactions: toNumber(row?.transactions),
  };
}

export async function getAdminRevenueDashboard(input: {
  partnerSort?: string | string[];
  range?: string | string[];
}) {
  const range = parseAdminRevenueRange(input.range);
  const partnerSort = parseAdminPartnerRevenueSort(input.partnerSort);
  const now = new Date();
  const since = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
  const previousSince = new Date(
    since.getTime() - range.days * 24 * 60 * 60 * 1000,
  );
  const paidAtSql = getPaidAtSql();
  const partnerOrderBySql =
    partnerSort.key === "lowest"
      ? Prisma.sql`"commission" ASC, "revenue" ASC, "transactions" ASC, bot."botUsername" ASC`
      : Prisma.sql`"commission" DESC, "revenue" DESC, "transactions" DESC, bot."botUsername" ASC`;

  const [
    currentSummary,
    previousSummary,
    activeVipUsers,
    planRows,
    methodRows,
    recentRows,
    partnerBotRows,
  ] = await Promise.all([
    getRevenueSummary({ since, until: now }),
    getRevenueSummary({ since: previousSince, until: since }),
    prisma.user.count({
      where: {
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
      JOIN "VipPricePlan" plan ON plan."id" = vp."vipPricePlanId"
      WHERE vp."status" = 'paid'
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
      WHERE vp."status" = 'paid'
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
        AND ${paidAtSql} >= ${since}
        AND ${paidAtSql} < ${now}
      ORDER BY ${paidAtSql} DESC
      LIMIT 20
    `),
    prisma.$queryRaw<PartnerBotRevenueRow[]>(Prisma.sql`
      WITH partner_payments AS (
        SELECT
          u."referredByPartnerBotId" AS "partnerBotId",
          COUNT(vp."id")::int AS "transactions",
          COALESCE(SUM(COALESCE(vp."paidAmount", vp."amount")), 0)::bigint AS "revenue",
          MAX(${paidAtSql}) AS "lastPaidAt"
        FROM "VipPayment" vp
        JOIN "User" u ON u."id" = vp."userId"
        WHERE vp."status" = 'paid'
          AND u."referredByPartnerBotId" IS NOT NULL
          AND ${paidAtSql} >= ${since}
          AND ${paidAtSql} < ${now}
        GROUP BY u."referredByPartnerBotId"
      ),
      partner_commissions AS (
        SELECT
          ac."partnerBotId" AS "partnerBotId",
          COALESCE(SUM(ac."amount"), 0)::bigint AS "commission"
        FROM "AffiliateCommission" ac
        WHERE ac."partnerBotId" IS NOT NULL
          AND ac."status" <> 'cancelled'
          AND ac."createdAt" >= ${since}
          AND ac."createdAt" < ${now}
        GROUP BY ac."partnerBotId"
      ),
      partner_users AS (
        SELECT
          u."referredByPartnerBotId" AS "partnerBotId",
          COUNT(*)::int AS "referredUsers",
          COUNT(*) FILTER (WHERE u."vipExpiresAt" > ${now})::int AS "activeVipUsers"
        FROM "User" u
        WHERE u."referredByPartnerBotId" IS NOT NULL
        GROUP BY u."referredByPartnerBotId"
      )
      SELECT
        bot."id"::text AS "partnerBotId",
        bot."botUsername" AS "botUsername",
        bot."isEnabled" AS "isEnabled",
        owner."name" AS "ownerName",
        owner."email" AS "ownerEmail",
        owner."telegramUsername" AS "ownerTelegramUsername",
        COALESCE(partner_users."referredUsers", 0)::int AS "referredUsers",
        COALESCE(partner_users."activeVipUsers", 0)::int AS "activeVipUsers",
        COALESCE(partner_payments."transactions", 0)::int AS "transactions",
        COALESCE(partner_payments."revenue", 0)::bigint AS "revenue",
        COALESCE(partner_commissions."commission", 0)::bigint AS "commission",
        partner_payments."lastPaidAt" AS "lastPaidAt"
      FROM "TelegramPartnerBot" bot
      JOIN "User" owner ON owner."id" = bot."ownerUserId"
      LEFT JOIN partner_payments ON partner_payments."partnerBotId" = bot."id"
      LEFT JOIN partner_commissions ON partner_commissions."partnerBotId" = bot."id"
      LEFT JOIN partner_users ON partner_users."partnerBotId" = bot."id"
      ORDER BY ${partnerOrderBySql}
      LIMIT 50
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
      partnerSort,
      partnerSortOptions: PARTNER_REVENUE_SORT_OPTIONS,
    },
    stats: {
      totalRevenue,
      transactions: currentSummary.transactions,
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
    partnerBots: partnerBotRows.map((row) => ({
      id: row.partnerBotId,
      botUsername: row.botUsername,
      isEnabled: row.isEnabled,
      ownerLabel:
        row.ownerEmail ||
        (row.ownerTelegramUsername
          ? `@${row.ownerTelegramUsername}`
          : row.ownerName),
      ownerName: row.ownerName,
      referredUsers: toNumber(row.referredUsers),
      activeVipUsers: toNumber(row.activeVipUsers),
      transactions: toNumber(row.transactions),
      revenue: toNumber(row.revenue),
      commission: toNumber(row.commission),
      lastPaidAt: row.lastPaidAt?.toISOString() ?? null,
    })),
    generatedAt: now.toISOString(),
  };
}
