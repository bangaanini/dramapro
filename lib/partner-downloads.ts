import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeTelegramBotUsername } from "@/lib/telegram-partner-bots";

export type PartnerDownloadQuota = {
  dailyLimit: number;
  enabled: boolean;
  periodKey: string;
  remaining: number;
  used: number;
};

export type PartnerDownloadBotOption = {
  botUsername: string;
  dailyLimit: number;
  enabled: boolean;
  id: string;
  remaining: number;
  used: number;
};

export class PartnerDownloadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "PartnerDownloadError";
  }
}

function getJakartaPeriodKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return `${partMap.get("year")}-${partMap.get("month")}-${partMap.get("day")}`;
}

function normalizeLimit(value: number) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export async function getPartnerDownloadQuota(input: {
  bot: {
    downloadDailyLimit: number;
    downloadEnabled: boolean;
    id: string;
    isEnabled: boolean;
  };
  userId: string;
}) {
  const periodKey = getJakartaPeriodKey();
  const dailyLimit = normalizeLimit(input.bot.downloadDailyLimit);
  const enabled = input.bot.isEnabled && input.bot.downloadEnabled && dailyLimit > 0;
  const used = enabled
    ? await prisma.partnerBotDownloadLog.count({
        where: {
          partnerBotId: input.bot.id,
          periodKey,
          userId: input.userId,
        },
      })
    : 0;

  return {
    dailyLimit,
    enabled,
    periodKey,
    remaining: enabled ? Math.max(0, dailyLimit - used) : 0,
    used,
  } satisfies PartnerDownloadQuota;
}

export async function getPartnerDownloadBotForOwner(input: {
  botUsername: string;
  ownerUserId: string;
}) {
  const botUsername = normalizeTelegramBotUsername(input.botUsername);

  if (!botUsername) {
    return null;
  }

  return prisma.telegramPartnerBot.findFirst({
    where: {
      botUsername,
      ownerUserId: input.ownerUserId,
    },
    select: {
      botUsername: true,
      downloadDailyLimit: true,
      downloadEnabled: true,
      id: true,
      isEnabled: true,
      ownerUserId: true,
    },
  });
}

export async function getPartnerDownloadBotsForOwner(ownerUserId: string) {
  const bots = await prisma.telegramPartnerBot.findMany({
    where: {
      ownerUserId,
      isEnabled: true,
      downloadEnabled: true,
      downloadDailyLimit: {
        gt: 0,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      botUsername: true,
      downloadDailyLimit: true,
      downloadEnabled: true,
      id: true,
      isEnabled: true,
    },
  });

  return Promise.all(
    bots.map(async (bot) => {
      const quota = await getPartnerDownloadQuota({ bot, userId: ownerUserId });

      return {
        botUsername: bot.botUsername,
        dailyLimit: quota.dailyLimit,
        enabled: quota.enabled,
        id: bot.id,
        remaining: quota.remaining,
        used: quota.used,
      } satisfies PartnerDownloadBotOption;
    }),
  );
}

export async function assertPartnerDownloadAvailable(input: {
  bot: {
    downloadDailyLimit: number;
    downloadEnabled: boolean;
    id: string;
    isEnabled: boolean;
  };
  userId: string;
}) {
  const quota = await getPartnerDownloadQuota(input);

  if (!quota.enabled) {
    throw new PartnerDownloadError(
      "Download partner belum diaktifkan admin untuk bot ini.",
      403,
    );
  }

  if (quota.remaining <= 0) {
    throw new PartnerDownloadError(
      "Limit download harian partner sudah habis.",
      429,
    );
  }

  return quota;
}

export async function consumePartnerDownloadQuota(input: {
  bot: {
    downloadDailyLimit: number;
    downloadEnabled: boolean;
    id: string;
    isEnabled: boolean;
  };
  episodeIndex: number;
  seriesId: string;
  userId: string;
}) {
  const periodKey = getJakartaPeriodKey();
  const dailyLimit = normalizeLimit(input.bot.downloadDailyLimit);

  if (!input.bot.isEnabled || !input.bot.downloadEnabled || dailyLimit <= 0) {
    throw new PartnerDownloadError(
      "Download partner belum diaktifkan admin untuk bot ini.",
      403,
    );
  }

  const uniqueWhere = {
    partnerBotId_userId_seriesId_episodeIndex_periodKey: {
      episodeIndex: input.episodeIndex,
      partnerBotId: input.bot.id,
      periodKey,
      seriesId: input.seriesId,
      userId: input.userId,
    },
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.partnerBotDownloadLog.findUnique({
        where: uniqueWhere,
        select: { id: true },
      });

      if (!existing) {
        const usedBefore = await tx.partnerBotDownloadLog.count({
          where: {
            partnerBotId: input.bot.id,
            periodKey,
            userId: input.userId,
          },
        });

        if (usedBefore >= dailyLimit) {
          throw new PartnerDownloadError(
            "Limit download harian partner sudah habis.",
            429,
          );
        }

        await tx.partnerBotDownloadLog.create({
          data: {
            episodeIndex: input.episodeIndex,
            partnerBotId: input.bot.id,
            periodKey,
            seriesId: input.seriesId,
            userId: input.userId,
          },
        });
      }

      const used = await tx.partnerBotDownloadLog.count({
        where: {
          partnerBotId: input.bot.id,
          periodKey,
          userId: input.userId,
        },
      });

      return {
        dailyLimit,
        enabled: true,
        periodKey,
        remaining: Math.max(0, dailyLimit - used),
        used,
      } satisfies PartnerDownloadQuota;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return getPartnerDownloadQuota({ bot: input.bot, userId: input.userId });
    }

    throw error;
  }
}
