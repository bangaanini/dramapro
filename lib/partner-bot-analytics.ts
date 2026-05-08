import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PartnerBotAnalyticsRange = "24h" | "7d" | "30d" | "90d";
export type PartnerBotAnalyticsSource = "all" | "web" | "telegram";

type BreakdownRow = {
  label: string | null;
  value: number | bigint;
};

type RetentionRow = {
  cohortVisitors: number | bigint;
  returningVisitors: number | bigint;
};

type CountRow = {
  value: number | bigint;
};

const RANGE_OPTIONS: Array<{
  key: PartnerBotAnalyticsRange;
  label: string;
  days: number;
}> = [
  { key: "24h", label: "24 jam", days: 1 },
  { key: "7d", label: "7 hari", days: 7 },
  { key: "30d", label: "30 hari", days: 30 },
  { key: "90d", label: "90 hari", days: 90 },
];

const SOURCE_OPTIONS: Array<{
  key: PartnerBotAnalyticsSource;
  label: string;
}> = [
  { key: "all", label: "Semua" },
  { key: "web", label: "Browser" },
  { key: "telegram", label: "Telegram" },
];

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

  return normalized
    .split(/[\s._-]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

export function parsePartnerBotAnalyticsRange(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (
    RANGE_OPTIONS.find((option) => option.key === candidate) ??
    RANGE_OPTIONS[1]
  );
}

export function parsePartnerBotAnalyticsSource(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (
    SOURCE_OPTIONS.find((option) => option.key === candidate) ??
    SOURCE_OPTIONS[0]
  );
}

function getSourceWhereSql(source: PartnerBotAnalyticsSource, alias?: string) {
  if (source === "all") {
    return Prisma.empty;
  }

  const prefix = alias ? Prisma.raw(`${alias}.`) : Prisma.empty;
  return Prisma.sql`AND ${prefix}"source" = ${source}`;
}

async function getBreakdown(input: {
  column:
    | "source"
    | "deviceType"
    | "osName"
    | "browserName"
    | "countryCode";
  partnerBotId: string;
  since: Date;
  source: PartnerBotAnalyticsSource;
  limit?: number;
}) {
  const column = Prisma.raw(`s."${input.column}"`);
  const sourceWhere = getSourceWhereSql(input.source, "s");
  const rows = await prisma.$queryRaw<BreakdownRow[]>(Prisma.sql`
    SELECT
      COALESCE(NULLIF(${column}, ''), 'unknown') AS "label",
      COUNT(*)::int AS "value"
    FROM "AnalyticsSession" s
    WHERE s."partnerBotId" = ${input.partnerBotId}
      AND s."startedAt" >= ${input.since}
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
  partnerBotId: string;
  source: PartnerBotAnalyticsSource;
}) {
  const todayStart = startOfUtcDay(input.now);
  const tomorrowStart = addDays(todayStart, 1);
  const cohortStart = addDays(todayStart, -input.days);
  const cohortEnd = addDays(cohortStart, 1);
  const sourceWhere = getSourceWhereSql(input.source, "s");
  const rows = await prisma.$queryRaw<RetentionRow[]>(Prisma.sql`
    WITH first_partner_session AS (
      SELECT
        s."visitorId",
        MIN(s."startedAt") AS "firstSeenAt"
      FROM "AnalyticsSession" s
      WHERE s."partnerBotId" = ${input.partnerBotId}
        ${sourceWhere}
      GROUP BY s."visitorId"
    ),
    cohort AS (
      SELECT fps."visitorId"
      FROM first_partner_session fps
      WHERE fps."firstSeenAt" >= ${cohortStart}
        AND fps."firstSeenAt" < ${cohortEnd}
    )
    SELECT
      (SELECT COUNT(*)::int FROM cohort) AS "cohortVisitors",
      COUNT(DISTINCT s."visitorId")::int AS "returningVisitors"
    FROM cohort c
    LEFT JOIN "AnalyticsSession" s
      ON s."visitorId" = c."visitorId"
      AND s."partnerBotId" = ${input.partnerBotId}
      AND s."startedAt" >= ${todayStart}
      AND s."startedAt" < ${tomorrowStart}
      ${sourceWhere}
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

async function getWatchedSeriesCount(input: {
  partnerBotId: string;
  since: Date;
  source: PartnerBotAnalyticsSource;
}) {
  const sourceWhere = getSourceWhereSql(input.source, "e");
  const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(DISTINCT e."seriesId")::int AS "value"
    FROM "AnalyticsEvent" e
    WHERE e."partnerBotId" = ${input.partnerBotId}
      AND e."type" = 'video_play'
      AND e."occurredAt" >= ${input.since}
      AND e."seriesId" IS NOT NULL
      ${sourceWhere}
  `);

  return toNumber(rows[0]?.value);
}

export async function getPartnerBotAnalyticsDashboard(input: {
  partnerBotId: string;
  range?: string | string[];
  source?: string | string[];
}) {
  const range = parsePartnerBotAnalyticsRange(input.range);
  const source = parsePartnerBotAnalyticsSource(input.source);
  const now = new Date();
  const since = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
  const onlineSince = new Date(now.getTime() - 5 * 60 * 1000);
  const sessionWhere = {
    partnerBotId: input.partnerBotId,
    startedAt: {
      gte: since,
    },
    ...(source.key === "all" ? {} : { source: source.key }),
  };
  const onlineWhere = {
    partnerBotId: input.partnerBotId,
    lastSeenAt: {
      gte: onlineSince,
    },
    ...(source.key === "all" ? {} : { source: source.key }),
  };
  const userWhere = {
    referredByPartnerBotId: input.partnerBotId,
  };

  const [
    onlineNow,
    partnerUsers,
    newPartnerUsers,
    totalSessions,
    returningSessions,
    sessionTotals,
    watchedSeries,
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
    prisma.user.count({ where: userWhere }),
    prisma.user.count({
      where: {
        ...userWhere,
        createdAt: {
          gte: since,
        },
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
    getWatchedSeriesCount({
      partnerBotId: input.partnerBotId,
      since,
      source: source.key,
    }),
    getBreakdown({
      column: "source",
      partnerBotId: input.partnerBotId,
      since,
      source: source.key,
      limit: 4,
    }),
    getBreakdown({
      column: "deviceType",
      partnerBotId: input.partnerBotId,
      since,
      source: source.key,
    }),
    getBreakdown({
      column: "osName",
      partnerBotId: input.partnerBotId,
      since,
      source: source.key,
    }),
    getBreakdown({
      column: "browserName",
      partnerBotId: input.partnerBotId,
      since,
      source: source.key,
    }),
    getBreakdown({
      column: "countryCode",
      partnerBotId: input.partnerBotId,
      since,
      source: source.key,
      limit: 10,
    }),
    getRetentionPoint({
      days: 1,
      now,
      partnerBotId: input.partnerBotId,
      source: source.key,
    }),
    getRetentionPoint({
      days: 7,
      now,
      partnerBotId: input.partnerBotId,
      source: source.key,
    }),
    getRetentionPoint({
      days: 30,
      now,
      partnerBotId: input.partnerBotId,
      source: source.key,
    }),
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
      partnerUsers,
      newPartnerUsers,
      totalViews,
      watchedSeries,
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
