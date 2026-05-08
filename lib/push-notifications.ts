import webPush from "web-push";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const PUSH_NOTIFICATION_TYPES = ["custom", "drama", "episode", "vip"] as const;
export const PUSH_NOTIFICATION_AUDIENCES = [
  "all",
  "guest",
  "users",
  "vip",
  "non_vip",
  "partner_bot",
  "specific_users",
] as const;

export type PushNotificationType = (typeof PUSH_NOTIFICATION_TYPES)[number];
export type PushNotificationAudience = (typeof PUSH_NOTIFICATION_AUDIENCES)[number];

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
};

export type PushTargetPayload = {
  partnerBotIds?: string[];
  userIds?: string[];
  emails?: string[];
  telegramUsernames?: string[];
  subscriptionIds?: string[];
  seriesId?: string;
  episodeIndex?: number;
  vipPricePlanId?: string;
};

export type PushCampaignInput = {
  type: PushNotificationType;
  audience: PushNotificationAudience;
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
  targetPayload?: PushTargetPayload;
};

let vapidConfigured = false;

function normalizeOptionalString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeStringArray(value: unknown, maxLength = 100) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeOptionalString(item, 160))
    .filter(Boolean)
    .slice(0, maxLength);
}

function normalizeTelegramUsername(value: string) {
  return value.trim().replace(/^@/u, "").toLowerCase();
}

export function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() || "";
  const contactEmail =
    process.env.WEB_PUSH_CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    "admin@layardrama.id";
  const subject = contactEmail.startsWith("mailto:")
    ? contactEmail
    : `mailto:${contactEmail}`;

  return {
    enabled: Boolean(publicKey && privateKey),
    privateKey,
    publicKey,
    subject,
  };
}

export function configureWebPush() {
  const config = getWebPushConfig();

  if (!config.enabled) {
    return null;
  }

  if (!vapidConfigured) {
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidConfigured = true;
  }

  return config;
}

export function normalizeNotificationTargetUrl(value: unknown) {
  const raw = normalizeOptionalString(value, 800);

  if (!raw) {
    return "/";
  }

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Invalid URLs fall back to home.
  }

  return "/";
}

export function normalizeNotificationImageUrl(value: unknown) {
  const raw = normalizeOptionalString(value, 800);

  if (!raw) {
    return "";
  }

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Invalid image URLs are ignored.
  }

  return "";
}

export function normalizePushNotificationInput(input: Partial<PushCampaignInput>) {
  const type = PUSH_NOTIFICATION_TYPES.includes(input.type as PushNotificationType)
    ? (input.type as PushNotificationType)
    : "custom";
  const audience = PUSH_NOTIFICATION_AUDIENCES.includes(
    input.audience as PushNotificationAudience,
  )
    ? (input.audience as PushNotificationAudience)
    : "all";
  const title = normalizeOptionalString(input.title, 90);
  const body = normalizeOptionalString(input.body, 220);

  if (!title) {
    throw new Error("Judul notifikasi wajib diisi.");
  }

  if (!body) {
    throw new Error("Isi pesan notifikasi wajib diisi.");
  }

  return {
    audience,
    body,
    imageUrl: normalizeNotificationImageUrl(input.imageUrl),
    targetPayload: normalizePushTargetPayload(input.targetPayload),
    targetUrl: normalizeNotificationTargetUrl(input.targetUrl),
    title,
    type,
  };
}

export function normalizePushTargetPayload(value: unknown): PushTargetPayload {
  const payload = typeof value === "object" && value ? (value as PushTargetPayload) : {};
  const episodeIndex =
    typeof payload.episodeIndex === "number" && Number.isFinite(payload.episodeIndex)
      ? Math.max(1, Math.floor(payload.episodeIndex))
      : undefined;

  return {
    emails: normalizeStringArray(payload.emails).map((email) => email.toLowerCase()),
    episodeIndex,
    partnerBotIds: normalizeStringArray(payload.partnerBotIds),
    seriesId: normalizeOptionalString(payload.seriesId, 80) || undefined,
    subscriptionIds: normalizeStringArray(payload.subscriptionIds),
    telegramUsernames: normalizeStringArray(payload.telegramUsernames).map(
      normalizeTelegramUsername,
    ),
    userIds: normalizeStringArray(payload.userIds),
    vipPricePlanId: normalizeOptionalString(payload.vipPricePlanId, 80) || undefined,
  };
}

export function cleanPushTargetPayload(value: unknown): Prisma.InputJsonValue {
  const payload = normalizePushTargetPayload(value);
  const data: Record<string, string[] | number | string> = {};

  if (payload.emails?.length) {
    data.emails = payload.emails;
  }

  if (payload.episodeIndex) {
    data.episodeIndex = payload.episodeIndex;
  }

  if (payload.partnerBotIds?.length) {
    data.partnerBotIds = payload.partnerBotIds;
  }

  if (payload.seriesId) {
    data.seriesId = payload.seriesId;
  }

  if (payload.subscriptionIds?.length) {
    data.subscriptionIds = payload.subscriptionIds;
  }

  if (payload.telegramUsernames?.length) {
    data.telegramUsernames = payload.telegramUsernames;
  }

  if (payload.userIds?.length) {
    data.userIds = payload.userIds;
  }

  if (payload.vipPricePlanId) {
    data.vipPricePlanId = payload.vipPricePlanId;
  }

  return data;
}

export function parsePushSubscriptionInput(value: unknown): PushSubscriptionInput {
  const input =
    typeof value === "object" && value ? (value as Partial<PushSubscriptionInput>) : {};
  const endpoint = normalizeOptionalString(input.endpoint, 2000);
  const keys = typeof input.keys === "object" && input.keys ? input.keys : {};
  const p256dh = normalizeOptionalString((keys as { p256dh?: unknown }).p256dh, 500);
  const auth = normalizeOptionalString((keys as { auth?: unknown }).auth, 500);

  if (!endpoint || !endpoint.startsWith("https://")) {
    throw new Error("Endpoint push tidak valid.");
  }

  if (!p256dh || !auth) {
    throw new Error("Key subscription push tidak lengkap.");
  }

  return {
    endpoint,
    keys: {
      auth,
      p256dh,
    },
  };
}

export async function registerPushSubscription(input: {
  subscription: PushSubscriptionInput;
  userAgent?: string;
  userId?: string | null;
  deviceLabel?: string;
  browserName?: string;
  platformName?: string;
}) {
  const now = new Date();
  const userId = input.userId || undefined;

  return prisma.pushSubscription.upsert({
    where: {
      endpoint: input.subscription.endpoint,
    },
    create: {
      auth: input.subscription.keys.auth,
      browserName: normalizeOptionalString(input.browserName, 80),
      deviceLabel: normalizeOptionalString(input.deviceLabel, 120),
      endpoint: input.subscription.endpoint,
      isActive: true,
      lastSeenAt: now,
      p256dh: input.subscription.keys.p256dh,
      platformName: normalizeOptionalString(input.platformName, 80),
      userAgent: normalizeOptionalString(input.userAgent, 600),
      userId: userId ?? null,
    },
    update: {
      auth: input.subscription.keys.auth,
      browserName: normalizeOptionalString(input.browserName, 80),
      deviceLabel: normalizeOptionalString(input.deviceLabel, 120),
      isActive: true,
      lastSeenAt: now,
      p256dh: input.subscription.keys.p256dh,
      platformName: normalizeOptionalString(input.platformName, 80),
      userAgent: normalizeOptionalString(input.userAgent, 600),
      userId,
    },
    select: {
      id: true,
      isActive: true,
      userId: true,
    },
  });
}

export async function deactivatePushSubscription(endpoint: string) {
  await prisma.pushSubscription.updateMany({
    where: {
      endpoint,
    },
    data: {
      isActive: false,
      lastSeenAt: new Date(),
    },
  });
}

function buildAudienceWhere(input: {
  audience: PushNotificationAudience;
  targetPayload?: PushTargetPayload;
}) {
  const now = new Date();
  const payload = normalizePushTargetPayload(input.targetPayload);
  const where: Prisma.PushSubscriptionWhereInput = {
    isActive: true,
  };

  if (payload.subscriptionIds?.length) {
    where.id = {
      in: payload.subscriptionIds,
    };
    return where;
  }

  if (input.audience === "guest") {
    where.userId = null;
  } else if (input.audience === "users") {
    where.userId = {
      not: null,
    };
  } else if (input.audience === "vip") {
    where.user = {
      is: {
        vipExpiresAt: {
          gt: now,
        },
      },
    };
  } else if (input.audience === "non_vip") {
    where.user = {
      is: {
        OR: [
          {
            vipExpiresAt: null,
          },
          {
            vipExpiresAt: {
              lte: now,
            },
          },
        ],
      },
    };
  } else if (input.audience === "partner_bot") {
    where.user = {
      is: {
        referredByPartnerBotId: {
          in: payload.partnerBotIds?.length ? payload.partnerBotIds : ["__none__"],
        },
      },
    };
  } else if (input.audience === "specific_users") {
    const hasSpecificTarget = Boolean(
      payload.userIds?.length ||
        payload.emails?.length ||
        payload.telegramUsernames?.length,
    );

    where.user = {
      is: {
        OR: hasSpecificTarget
          ? [
              ...(payload.userIds?.length
                ? [
                    {
                      id: {
                        in: payload.userIds,
                      },
                    },
                  ]
                : []),
              ...(payload.emails?.length
                ? [
                    {
                      email: {
                        in: payload.emails,
                        mode: "insensitive" as const,
                      },
                    },
                  ]
                : []),
              ...(payload.telegramUsernames?.length
                ? [
                    {
                      telegramUsername: {
                        in: payload.telegramUsernames,
                        mode: "insensitive" as const,
                      },
                    },
                  ]
                : []),
            ]
          : [
              {
                id: "__none__",
              },
            ],
      },
    };
  }

  return where;
}

export async function estimatePushNotificationTargets(input: {
  audience: PushNotificationAudience;
  targetPayload?: PushTargetPayload;
}) {
  return prisma.pushSubscription.count({
    where: buildAudienceWhere(input),
  });
}

export async function queuePushNotificationCampaign(input: {
  adminUserId?: string | null;
  campaign: Partial<PushCampaignInput>;
}) {
  const campaign = normalizePushNotificationInput(input.campaign);
  const subscriptions = await prisma.pushSubscription.findMany({
    where: buildAudienceWhere({
      audience: campaign.audience,
      targetPayload: campaign.targetPayload,
    }),
    select: {
      id: true,
      userId: true,
    },
    take: 50_000,
  });
  const now = new Date();
  const totalTargets = subscriptions.length;
  const status = totalTargets > 0 ? "queued" : "failed";

  return prisma.$transaction(async (tx) => {
    const createdCampaign = await tx.pushNotificationCampaign.create({
      data: {
        audience: campaign.audience,
        body: campaign.body,
        createdByAdminUserId: input.adminUserId || null,
        failedCount: 0,
        imageUrl: campaign.imageUrl,
        lastError: totalTargets > 0 ? "" : "Tidak ada subscriber untuk target ini.",
        queuedAt: totalTargets > 0 ? now : null,
        queuedCount: totalTargets,
        sentCount: 0,
        skippedCount: 0,
        status,
        targetPayload: cleanPushTargetPayload(campaign.targetPayload),
        targetUrl: campaign.targetUrl,
        title: campaign.title,
        totalTargets,
        type: campaign.type,
      },
      select: {
        id: true,
        status: true,
        totalTargets: true,
      },
    });

    if (subscriptions.length > 0) {
      await tx.pushNotificationDelivery.createMany({
        data: subscriptions.map((subscription) => ({
          campaignId: createdCampaign.id,
          subscriptionId: subscription.id,
          userId: subscription.userId,
        })),
        skipDuplicates: true,
      });
    }

    return createdCampaign;
  });
}

function buildPushPayload(campaign: {
  body: string;
  id: string;
  imageUrl: string;
  targetUrl: string;
  title: string;
  type: string;
}) {
  return JSON.stringify({
    body: campaign.body,
    data: {
      campaignId: campaign.id,
      targetUrl: campaign.targetUrl || "/",
      type: campaign.type,
    },
    icon: "/favicon_io/android-chrome-192x192.png",
    image: campaign.imageUrl || undefined,
    tag: `dramapro-${campaign.id}`,
    title: campaign.title,
  });
}

function getPushErrorStatusCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeStatus = (error as { statusCode?: unknown }).statusCode;
  return typeof maybeStatus === "number" ? maybeStatus : null;
}

function getPushErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Gagal mengirim push notification.";
}

async function refreshCampaignCounters(campaignId: string) {
  const [queuedCount, sentCount, failedCount, skippedCount] = await Promise.all([
    prisma.pushNotificationDelivery.count({
      where: {
        campaignId,
        status: "queued",
      },
    }),
    prisma.pushNotificationDelivery.count({
      where: {
        campaignId,
        status: "sent",
      },
    }),
    prisma.pushNotificationDelivery.count({
      where: {
        campaignId,
        status: "failed",
      },
    }),
    prisma.pushNotificationDelivery.count({
      where: {
        campaignId,
        status: "skipped",
      },
    }),
  ]);
  const isFinished = queuedCount === 0;
  const nextStatus = isFinished ? (sentCount > 0 ? "sent" : "failed") : "sending";

  await prisma.pushNotificationCampaign.update({
    where: {
      id: campaignId,
    },
    data: {
      failedCount,
      finishedAt: isFinished ? new Date() : null,
      queuedCount,
      sentCount,
      skippedCount,
      status: nextStatus,
    },
  });
}

export async function processPushNotificationBatch(batchSize = 100) {
  const config = configureWebPush();

  if (!config) {
    return {
      disabled: true,
      processed: 0,
    };
  }

  const campaign = await prisma.pushNotificationCampaign.findFirst({
    where: {
      status: {
        in: ["queued", "sending"],
      },
      deliveries: {
        some: {
          status: "queued",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!campaign) {
    return {
      disabled: false,
      processed: 0,
    };
  }

  await prisma.pushNotificationCampaign.update({
    where: {
      id: campaign.id,
    },
    data: {
      startedAt: new Date(),
      status: "sending",
    },
  });

  const deliveries = await prisma.pushNotificationDelivery.findMany({
    where: {
      campaignId: campaign.id,
      status: "queued",
    },
    include: {
      campaign: true,
      subscription: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: batchSize,
  });

  for (const delivery of deliveries) {
    const attemptedAt = new Date();

    if (!delivery.subscription.isActive) {
      await prisma.pushNotificationDelivery.update({
        where: {
          id: delivery.id,
        },
        data: {
          attemptedAt,
          error: "Subscription nonaktif.",
          status: "skipped",
        },
      });
      continue;
    }

    try {
      await webPush.sendNotification(
        {
          endpoint: delivery.subscription.endpoint,
          keys: {
            auth: delivery.subscription.auth,
            p256dh: delivery.subscription.p256dh,
          },
        },
        buildPushPayload(delivery.campaign),
        {
          TTL: 60 * 60 * 24,
        },
      );

      await prisma.$transaction([
        prisma.pushNotificationDelivery.update({
          where: {
            id: delivery.id,
          },
          data: {
            attemptedAt,
            error: "",
            sentAt: new Date(),
            status: "sent",
          },
        }),
        prisma.pushSubscription.update({
          where: {
            id: delivery.subscriptionId,
          },
          data: {
            failureCount: 0,
            isActive: true,
            lastSuccessAt: new Date(),
          },
        }),
      ]);
    } catch (error) {
      const statusCode = getPushErrorStatusCode(error);
      const shouldDeactivate = statusCode === 404 || statusCode === 410;
      const message = getPushErrorMessage(error);

      await prisma.$transaction([
        prisma.pushNotificationDelivery.update({
          where: {
            id: delivery.id,
          },
          data: {
            attemptedAt,
            error: message,
            status: "failed",
          },
        }),
        prisma.pushSubscription.update({
          where: {
            id: delivery.subscriptionId,
          },
          data: {
            failureCount: {
              increment: 1,
            },
            isActive: shouldDeactivate ? false : undefined,
            lastFailureAt: new Date(),
          },
        }),
      ]);
    }
  }

  await refreshCampaignCounters(campaign.id);

  return {
    disabled: false,
    processed: deliveries.length,
  };
}
