import { prisma } from "@/lib/prisma";

export async function getPartnerBotUsersDashboard(input: {
  partnerBotId: string;
}) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeVipUsers, newUsers, paidUsers, recentUsers] =
    await Promise.all([
      prisma.user.count({
        where: {
          referredByPartnerBotId: input.partnerBotId,
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
      prisma.user.count({
        where: {
          referredByPartnerBotId: input.partnerBotId,
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      prisma.user.count({
        where: {
          referredByPartnerBotId: input.partnerBotId,
          vipPayments: {
            some: {
              status: "paid",
            },
          },
        },
      }),
      prisma.user.findMany({
        where: {
          referredByPartnerBotId: input.partnerBotId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          authProvider: true,
          telegramUsername: true,
          telegramPhotoUrl: true,
          createdAt: true,
          vipExpiresAt: true,
          _count: {
            select: {
              vipPayments: {
                where: {
                  status: "paid",
                },
              },
              watchHistory: true,
            },
          },
        },
        take: 100,
      }),
    ]);

  return {
    stats: {
      totalUsers,
      activeVipUsers,
      newUsers,
      paidUsers,
    },
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      telegramUsername: user.telegramUsername,
      telegramPhotoUrl: user.telegramPhotoUrl,
      createdAt: user.createdAt.toISOString(),
      vipExpiresAt: user.vipExpiresAt?.toISOString() ?? null,
      paidTransactions: user._count.vipPayments,
      watchedSeries: user._count.watchHistory,
    })),
    generatedAt: now.toISOString(),
  };
}
