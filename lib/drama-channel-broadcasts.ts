import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildDramaShareStartParam,
  buildTelegramMiniAppStartAppLinkForUsername,
  pinTelegramChatMessageWithToken,
  sendTelegramPhotoWithToken,
} from "@/lib/telegram-bot";

const DEFAULT_BROADCAST_BUTTON_LABEL = "▶️ Tonton Sekarang";
const MAX_CAPTION_LENGTH = 1024;
const VIP_LINK_LABEL = "🛍️ Langganan VIP Sekarang";
const GUIDE_LINK_LABEL = "📚 Panduan Pengguna";
const SUPPORT_LINK_LABEL = "📞 Hubungi Admin Sekarang";

type PublishDramaChannelBroadcastInput = {
  botKind: "default" | "partner";
  botToken: string;
  botUsername: string;
  buttonLabel: string;
  caption: string;
  channelUsername: string;
  includeBoxOfficeButton?: boolean;
  includeSearchButton?: boolean;
  boxOfficeButtonUrl?: string | null;
  dramaId: string;
  ownerUserId?: string | null;
  partnerBotId?: string | null;
  pinMessage?: boolean;
};

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function getDefaultDramaChannelBroadcastButtonLabel() {
  return DEFAULT_BROADCAST_BUTTON_LABEL;
}

export function normalizeTelegramChannelUsername(value: string) {
  const raw = value.trim();

  if (!raw) {
    return null;
  }

  if (raw.startsWith("https://t.me/") || raw.startsWith("http://t.me/")) {
    try {
      const url = new URL(raw);
      const [firstSegment] = url.pathname.split("/").filter(Boolean);
      const normalized = firstSegment?.replace(/^@/, "") ?? "";

      if (/^[a-zA-Z0-9_]{4,64}$/.test(normalized)) {
        return normalized;
      }
    } catch {
      return null;
    }
  }

  const normalized = raw.replace(/^@/, "");

  if (!/^[a-zA-Z0-9_]{4,64}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function buildTelegramBotChatUrlForUsername(botUsername: string) {
  const normalizedUsername = botUsername.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    throw new Error("Telegram bot username belum diatur.");
  }

  return `https://t.me/${normalizedUsername}`;
}

export function buildDefaultDramaChannelBroadcastCaption(input: {
  botUsername: string;
  description?: string | null;
  title: string;
}) {
  const title = truncateText(input.title, 120) || "Drama pilihan";
  const description = truncateText(input.description ?? "", 360) || "Sinopsis belum tersedia.";
  const lines = [
    `🎬 ${title}`,
    "",
    description,
    "",
    "———————————————",
    "💎 AKSES VIP - NONTON SEPUASNYA",
    "Dapatkan akses ke semua episode premium short drama hanya mulai Rp3.000 per hari.",
    VIP_LINK_LABEL,
    "",
    "☎️ BANTUAN & PERTANYAAN",
    "Jika mengalami kendala atau butuh bantuan:",
    GUIDE_LINK_LABEL,
    SUPPORT_LINK_LABEL,
    "",
    "Klik tombol di bawah untuk mulai👇",
  ];

  return lines.join("\n");
}

function buildCaptionTextLinkEntities(caption: string, url: string) {
  const entities: Array<{
    length: number;
    offset: number;
    type: "text_link";
    url: string;
  }> = [];

  for (const label of [VIP_LINK_LABEL, GUIDE_LINK_LABEL, SUPPORT_LINK_LABEL]) {
    const offset = caption.indexOf(label);

    if (offset < 0) {
      continue;
    }

    entities.push({
      length: label.length,
      offset,
      type: "text_link",
      url,
    });
  }

  return entities;
}

export async function searchDramasForChannelBroadcast(query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return prisma.catalogSeries.findMany({
      where: {
        coverUrl: {
          not: "",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        description: true,
        chapterCount: true,
        id: true,
        platformId: true,
        coverUrl: true,
        title: true,
        updatedAt: true,
      },
      take: 20,
    }).then((rows) =>
      rows.map((row) => ({
        description: row.description,
        episodeCount: row.chapterCount,
        id: row.id,
        providerName: row.platformId,
        thumbUrl: row.coverUrl,
        title: row.title,
        updatedAt: row.updatedAt,
      })),
    );
  }

  return prisma.catalogSeries.findMany({
    where: {
      coverUrl: {
        not: "",
      },
      ...(trimmedQuery
        ? {
            OR: [
              {
                title: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
              {
                tags: {
                  hasSome: [trimmedQuery],
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      description: true,
      chapterCount: true,
      id: true,
      platformId: true,
      coverUrl: true,
      title: true,
      updatedAt: true,
    },
    take: 20,
  }).then((rows) =>
    rows.map((row) => ({
      description: row.description,
      episodeCount: row.chapterCount,
      id: row.id,
      providerName: row.platformId,
      thumbUrl: row.coverUrl,
      title: row.title,
      updatedAt: row.updatedAt,
    })),
  );
}

export async function listRecentDramaChannelBroadcasts(input?: {
  botKind?: "default" | "partner";
  limit?: number;
  ownerUserId?: string;
  partnerBotId?: string;
}) {
  const limit = input?.limit ?? 8;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      botUsername: string;
      buttonLabel: string;
      channelUsername: string;
      createdAt: Date;
      pinned: boolean;
      postedAt: Date | null;
      telegramMessageId: number | null;
      dramaId: string;
      dramaThumbUrl: string;
      dramaTitle: string;
    }>
  >(Prisma.sql`
    SELECT
      b.id,
      b."botUsername",
      b."buttonLabel",
      b."channelUsername",
      b."createdAt",
      b.pinned,
      b."postedAt",
      b."telegramMessageId",
      s.id AS "dramaId",
      s."coverUrl" AS "dramaThumbUrl",
      s.title AS "dramaTitle"
    FROM "DramaChannelBroadcast" b
    INNER JOIN "CatalogSeries" s
      ON s.id = b."seriesId"
    WHERE 1 = 1
      ${input?.botKind ? Prisma.sql`AND b."botKind" = ${input.botKind}` : Prisma.empty}
      ${input?.ownerUserId ? Prisma.sql`AND b."ownerUserId" = ${input.ownerUserId}` : Prisma.empty}
      ${input?.partnerBotId ? Prisma.sql`AND b."partnerBotId" = ${input.partnerBotId}` : Prisma.empty}
    ORDER BY b."createdAt" DESC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    id: row.id,
    botUsername: row.botUsername,
    buttonLabel: row.buttonLabel,
    channelUsername: row.channelUsername,
    createdAt: row.createdAt,
    pinned: row.pinned,
    postedAt: row.postedAt,
    telegramMessageId: row.telegramMessageId,
    drama: {
      id: row.dramaId,
      thumbUrl: row.dramaThumbUrl,
      title: row.dramaTitle,
    },
  }));
}

export async function publishDramaChannelBroadcast(
  input: PublishDramaChannelBroadcastInput,
) {
  const normalizedChannelUsername = normalizeTelegramChannelUsername(
    input.channelUsername,
  );

  if (!normalizedChannelUsername) {
    throw new Error(
      "Username channel wajib valid. Gunakan @channelkamu atau link t.me/channelkamu.",
    );
  }

  const drama = await prisma.catalogSeries.findUnique({
    where: { id: input.dramaId },
    select: {
      description: true,
      id: true,
      coverUrl: true,
      title: true,
    },
  });

  if (!drama) {
    throw new Error("Drama untuk broadcast tidak ditemukan.");
  }

  if (!drama.coverUrl.trim()) {
    throw new Error("Drama ini belum punya poster, jadi belum bisa dibroadcast ke channel.");
  }

  const buttonLabel = input.buttonLabel.trim() || DEFAULT_BROADCAST_BUTTON_LABEL;
  const caption = input.caption.trim();

  if (!caption) {
    throw new Error("Caption broadcast wajib diisi.");
  }

  if (caption.length > MAX_CAPTION_LENGTH) {
    throw new Error("Caption terlalu panjang. Maksimal 1024 karakter untuk post bergambar Telegram.");
  }

  const detailStartParam = buildDramaShareStartParam({
    dramaId: drama.id,
  });
  const detailDeepLinkUrl = buildTelegramMiniAppStartAppLinkForUsername(
    input.botUsername,
    detailStartParam,
  );
  const searchDeepLinkUrl = buildTelegramMiniAppStartAppLinkForUsername(
    input.botUsername,
    "search",
  );
  const botChatUrl = buildTelegramBotChatUrlForUsername(input.botUsername);
  const captionEntities = buildCaptionTextLinkEntities(caption, botChatUrl);

  const inlineKeyboard: Array<Array<{ text: string; url: string }>> = [
    [
      {
        text: buttonLabel,
        url: detailDeepLinkUrl,
      },
    ],
  ];

  const secondaryRow: Array<{ text: string; url: string }> = [];

  if (input.includeSearchButton) {
    secondaryRow.push({
      text: "🔎 Cari Judul",
      url: searchDeepLinkUrl,
    });
  }

  const boxOfficeButtonUrl = input.boxOfficeButtonUrl?.trim() ?? "";

  if (input.includeBoxOfficeButton && boxOfficeButtonUrl) {
    secondaryRow.push({
      text: "🎬 Nonton Box Office",
      url: boxOfficeButtonUrl,
    });
  }

  if (secondaryRow.length > 0) {
    inlineKeyboard.push(secondaryRow);
  }

  const draft = await prisma.dramaChannelBroadcast.create({
    data: {
      botKind: input.botKind,
      botUsername: input.botUsername.trim().replace(/^@/, ""),
      buttonLabel,
      caption,
      channelUsername: normalizedChannelUsername,
      seriesId: drama.id,
      ownerUserId: input.ownerUserId ?? null,
      partnerBotId: input.partnerBotId ?? null,
      pinned: false,
    },
  });

  try {
    const sent = (await sendTelegramPhotoWithToken(input.botToken, {
      caption,
      caption_entities: captionEntities,
      chat_id: `@${normalizedChannelUsername}`,
      photo: drama.coverUrl,
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    })) as { result?: { message_id?: number } } | null;

    const messageId = sent?.result?.message_id ?? null;

    let pinError: string | null = null;

    if (input.pinMessage && messageId) {
      try {
        await pinTelegramChatMessageWithToken(input.botToken, {
          chat_id: `@${normalizedChannelUsername}`,
          disable_notification: true,
          message_id: messageId,
        });
      } catch (error) {
        pinError =
          error instanceof Error ? error.message : "Pin post Telegram gagal.";
      }
    }

    const broadcast = await prisma.dramaChannelBroadcast.update({
      where: { id: draft.id },
      data: {
        pinned: input.pinMessage && !pinError,
        postedAt: new Date(),
        telegramMessageId: messageId,
      },
    });

    return {
      broadcast,
      channelPostUrl:
        messageId && normalizedChannelUsername
          ? `https://t.me/${normalizedChannelUsername}/${messageId}`
          : null,
      detailDeepLinkUrl,
      pinError,
    };
  } catch (error) {
    await prisma.dramaChannelBroadcast.delete({
      where: { id: draft.id },
    }).catch(() => undefined);

    throw error;
  }
}
