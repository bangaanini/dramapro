import { Prisma } from "@/app/generated/prisma/client";
import {
  DEFAULT_AFFILIATE_SETTINGS,
  getAffiliateTier,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { getUserSecondaryLabel } from "@/lib/user-identity";
import { isVipActive } from "@/lib/vip";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function normalizeUserSearchQuery(query: string) {
  return query.trim().slice(0, 80);
}

export function buildAdminUsersWhere(query: string): Prisma.UserWhereInput {
  const normalizedQuery = normalizeUserSearchQuery(query);

  if (!normalizedQuery) {
    return {};
  }

  return {
    OR: [
      {
        name: {
          contains: normalizedQuery,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: normalizedQuery,
          mode: "insensitive",
        },
      },
      {
        telegramUsername: {
          contains: normalizedQuery.replace(/^@/, ""),
          mode: "insensitive",
        },
      },
      {
        affiliateCode: {
          contains: normalizedQuery.toUpperCase(),
          mode: "insensitive",
        },
      },
    ],
  };
}

export async function getAdminUsersTableData(input?: {
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = normalizeUserSearchQuery(input?.query ?? "");
  const pageSize = Math.min(
    Math.max(Math.floor(input?.pageSize ?? DEFAULT_PAGE_SIZE), 1),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(Math.floor(input?.page ?? 1), 1);
  const where = buildAdminUsersWhere(query);
  const [total, affiliateSettings] = await Promise.all([
    prisma.user.count({ where }),
    prisma.affiliateSettings.findUnique({
      where: { id: "global" },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: {
      referredBy: {
        select: {
          name: true,
          email: true,
          authProvider: true,
          telegramUsername: true,
        },
      },
      _count: {
        select: {
          favorites: true,
          watchHistory: true,
          sessions: true,
          referrals: true,
        },
      },
    },
  });
  const userIds = users.map((user) => user.id);
  const activeReferralGroups =
    userIds.length > 0
      ? await prisma.user.groupBy({
          by: ["referredById"],
          where: {
            referredById: {
              in: userIds,
            },
            vipPayments: {
              some: {
                status: "paid",
              },
            },
          },
          _count: {
            _all: true,
          },
        })
      : [];
  const activeReferralMap = new Map(
    activeReferralGroups
      .filter((item) => item.referredById)
      .map((item) => [item.referredById as string, item._count._all]),
  );
  const resolvedAffiliateSettings = affiliateSettings ?? DEFAULT_AFFILIATE_SETTINGS;

  return {
    query,
    page: safePage,
    pageSize,
    total,
    totalPages,
    users: users.map((user) => {
      const activeReferralCount = activeReferralMap.get(user.id) ?? 0;
      const generalTier = getAffiliateTier(
        activeReferralCount,
        resolvedAffiliateSettings,
      );
      const commissionOverride =
        typeof user.affiliateCommissionOverrideRate === "number"
          ? user.affiliateCommissionOverrideRate
          : null;
      const effectiveCommissionRate = commissionOverride ?? generalTier.rate;

      return {
        id: user.id,
        name: user.name,
        secondaryLabel: getUserSecondaryLabel(user),
        referredBy: user.referredBy
          ? {
              name: user.referredBy.name,
              secondaryLabel: getUserSecondaryLabel(user.referredBy),
            }
          : null,
        authProvider: user.authProvider,
        hasActiveVip: isVipActive(user.vipExpiresAt),
        vipExpiresAt: user.vipExpiresAt?.toISOString() ?? null,
        favoritesCount: user._count.favorites,
        watchHistoryCount: user._count.watchHistory,
        sessionsCount: user._count.sessions,
        totalReferralCount: user._count.referrals,
        activeReferralCount,
        commissionOverride,
        effectiveCommissionRate,
        generalTierLevel: generalTier.level,
        generalTierRate: generalTier.rate,
        createdAt: user.createdAt.toISOString(),
      };
    }),
  };
}

export type AdminUsersTableData = Awaited<
  ReturnType<typeof getAdminUsersTableData>
>;
export type AdminUsersTableRow = AdminUsersTableData["users"][number];
