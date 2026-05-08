import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminAnalyticsRange = "24h" | "7d" | "30d" | "90d" | "all";
export type AdminAnalyticsSource = "all" | "web" | "telegram";

type BreakdownRow = {
  label: string | null;
  value: number | bigint;
};

type RetentionRow = {
  cohortVisitors: number | bigint;
  returningVisitors: number | bigint;
};

const RANGE_OPTIONS: Array<{
  key: AdminAnalyticsRange;
  label: string;
  days: number | null;
}> = [
  { key: "24h", label: "24 jam", days: 1 },
  { key: "7d", label: "7 hari", days: 7 },
  { key: "30d", label: "30 hari", days: 30 },
  { key: "90d", label: "90 hari", days: 90 },
  { key: "all", label: "Sepanjang masa", days: null },
];

const SOURCE_OPTIONS: Array<{
  key: AdminAnalyticsSource;
  label: string;
}> = [
  { key: "all", label: "Semua" },
  { key: "web", label: "Browser" },
  { key: "telegram", label: "Telegram" },
];

function toNumber(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return value ?? 0;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function formatDimensionLabel(value: string | null) {
  const normalized = value?.trim() || "unknown";

  if (normalized === "unknown") {
    return "Unknown";
  }

  if (normalized.length === 2 && normalized === normalized.toUpperCase()) {
    return normalized;
  }

  return normalized
    .split(/[\s._-]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const COUNTRY_LABEL_ALIASES: Record<string, string> = {
  EN: "Inggris",
  UK: "Inggris Raya",
  T1: "Tor / Anonymous",
  XX: "Unknown",
};

const COUNTRY_DISPLAY_NAMES =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["id-ID", "id"], { type: "region" })
    : null;

function formatCountryLabel(value: string | null) {
  const normalized = value?.trim() || "unknown";

  if (normalized === "unknown") {
    return "Unknown";
  }

  const countryCode = normalized.toUpperCase();
  const alias = COUNTRY_LABEL_ALIASES[countryCode];

  if (alias) {
    return alias;
  }

  if (/^[A-Z]{2}$/u.test(countryCode)) {
    return COUNTRY_DISPLAY_NAMES?.of(countryCode) ?? countryCode;
  }

  return formatDimensionLabel(normalized);
}

export function parseAdminAnalyticsRange(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (
    RANGE_OPTIONS.find((option) => option.key === candidate) ??
    RANGE_OPTIONS[1]
  );
}

export function parseAdminAnalyticsSource(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (
    SOURCE_OPTIONS.find((option) => option.key === candidate) ??
    SOURCE_OPTIONS[0]
  );
}

function getSourceWhereSql(source: AdminAnalyticsSource, alias?: string) {
  if (source === "all") {
    return Prisma.empty;
  }

  const prefix = alias ? Prisma.raw(`${alias}.`) : Prisma.empty;
  return Prisma.sql`AND ${prefix}"source" = ${source}`;
}

function getVisitorSourceWhereSql(source: AdminAnalyticsSource) {
  if (source === "all") {
    return Prisma.empty;
  }

  return Prisma.sql`AND v."firstSource" = ${source}`;
}

async function getBreakdown(input: {
  column:
    | "source"
    | "deviceType"
    | "osName"
    | "browserName"
    | "countryCode";
  since: Date | null;
  source: AdminAnalyticsSource;
  limit?: number;
}) {
  const column = Prisma.raw(`"${input.column}"`);
  const sourceWhere = getSourceWhereSql(input.source);
  const sinceWhere = input.since
    ? Prisma.sql`AND "startedAt" >= ${input.since}`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<BreakdownRow[]>(Prisma.sql`
    SELECT
      COALESCE(NULLIF(${column}, ''), 'unknown') AS "label",
      COUNT(*)::int AS "value"
    FROM "AnalyticsSession"
    WHERE TRUE
      ${sinceWhere}
      ${sourceWhere}
    GROUP BY 1
    ORDER BY "value" DESC, "label" ASC
    LIMIT ${input.limit ?? 8}
  `);
  const total = rows.reduce((sum, row) => sum + toNumber(row.value), 0);

  return rows.map((row) => {
    const value = toNumber(row.value);

    return {
      label:
        input.column === "countryCode"
          ? formatCountryLabel(row.label)
          : formatDimensionLabel(row.label),
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    };
  });
}

async function getRetentionPoint(input: {
  days: 1 | 7 | 30;
  now: Date;
  source: AdminAnalyticsSource;
}) {
  const todayStart = startOfUtcDay(input.now);
  const tomorrowStart = addDays(todayStart, 1);
  const cohortStart = addDays(todayStart, -input.days);
  const cohortEnd = addDays(cohortStart, 1);
  const visitorSourceWhere = getVisitorSourceWhereSql(input.source);
  const sessionSourceWhere = getSourceWhereSql(input.source, "s");
  const rows = await prisma.$queryRaw<RetentionRow[]>(Prisma.sql`
    WITH cohort AS (
      SELECT v."id"
      FROM "AnalyticsVisitor" v
      WHERE v."firstSeenAt" >= ${cohortStart}
        AND v."firstSeenAt" < ${cohortEnd}
        ${visitorSourceWhere}
    )
    SELECT
      (SELECT COUNT(*)::int FROM cohort) AS "cohortVisitors",
      COUNT(DISTINCT s."visitorId")::int AS "returningVisitors"
    FROM cohort c
    LEFT JOIN "AnalyticsSession" s
      ON s."visitorId" = c."id"
      AND s."startedAt" >= ${todayStart}
      AND s."startedAt" < ${tomorrowStart}
      ${sessionSourceWhere}
  `);
  const row = rows[0];
  const cohortVisitors = toNumber(row?.cohortVisitors);
  const returningVisitors = toNumber(row?.returningVisitors);

  return {
    label: `D${input.days}`,
    days: input.days,
    cohortVisitors,
    returningVisitors,
    rate:
      cohortVisitors > 0
        ? Math.round((returningVisitors / cohortVisitors) * 100)
        : 0,
  };
}

export async function getAdminAnalyticsDashboard(input: {
  range?: string | string[];
  source?: string | string[];
}) {
  const range = parseAdminAnalyticsRange(input.range);
  const source = parseAdminAnalyticsSource(input.source);
  const now = new Date();
  const since =
    range.days === null
      ? null
      : new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
  const onlineSince = new Date(now.getTime() - 5 * 60 * 1000);
  const sessionWhere = {
    ...(since ? { startedAt: { gte: since } } : {}),
    ...(source.key === "all" ? {} : { source: source.key }),
  };
  const onlineWhere = {
    lastSeenAt: {
      gte: onlineSince,
    },
    ...(source.key === "all" ? {} : { source: source.key }),
  };

  const [
    onlineNow,
    totalUsers,
    newUsers,
    totalSeries,
    totalSessions,
    returningSessions,
    sessionTotals,
    platforms,
    deviceTypes,
    operatingSystems,
    browsers,
    countries,
    retentionD1,
    retentionD7,
    retentionD30,
  ] = await Promise.all([
    prisma.analyticsSession.count({ where: onlineWhere }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    }),
    prisma.catalogSeries.count({
      where: {
        isHomepageVisible: true,
      },
    }),
    prisma.analyticsSession.count({ where: sessionWhere }),
    prisma.analyticsSession.count({
      where: {
        ...sessionWhere,
        isReturning: true,
      },
    }),
    prisma.analyticsSession.aggregate({
      where: sessionWhere,
      _sum: {
        pageViewCount: true,
        videoPlayCount: true,
      },
    }),
    getBreakdown({
      column: "source",
      since,
      source: source.key,
      limit: 4,
    }),
    getBreakdown({
      column: "deviceType",
      since,
      source: source.key,
    }),
    getBreakdown({
      column: "osName",
      since,
      source: source.key,
    }),
    getBreakdown({
      column: "browserName",
      since,
      source: source.key,
    }),
    getBreakdown({
      column: "countryCode",
      since,
      source: source.key,
      limit: 10,
    }),
    getRetentionPoint({ days: 1, now, source: source.key }),
    getRetentionPoint({ days: 7, now, source: source.key }),
    getRetentionPoint({ days: 30, now, source: source.key }),
  ]);
  const totalViews = sessionTotals._sum.videoPlayCount ?? 0;
  const totalPageViews = sessionTotals._sum.pageViewCount ?? 0;

  return {
    filters: {
      range,
      source,
      rangeOptions: RANGE_OPTIONS,
      sourceOptions: SOURCE_OPTIONS,
    },
    stats: {
      onlineNow,
      totalUsers,
      newUsers,
      totalViews,
      totalSeries,
    },
    engagement: {
      totalSessions,
      returningSessions,
      returningRate:
        totalSessions > 0
          ? Math.round((returningSessions / totalSessions) * 100)
          : 0,
      totalPageViews,
    },
    retention: [retentionD1, retentionD7, retentionD30],
    breakdowns: {
      platforms,
      deviceTypes,
      operatingSystems,
      browsers,
      countries,
    },
    generatedAt: now.toISOString(),
  };
}
