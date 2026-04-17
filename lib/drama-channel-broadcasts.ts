import { prisma } from "@/lib/prisma";
import { getHomepageBroadcastDramaEntries } from "@/lib/catalog-data";
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
  const description = truncateText(input.description ?? "", 360) || "Sinopsis belum tersedia.";
  const lines = [
    "SINOPSIS",
    "",
    description,
    "",
    "———————————————",
    "💎 AKSES VIP - NONTON SEPUASNYA",
    "Dapatkan akses ke semua episode premium short drama hanya mulai Rp2.000 per hari.",
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
    return getHomepageBroadcastDramaEntries(20);
  }

  return prisma.drama.findMany({
    where: {
      isStreamPlayable: true,
      thumbUrl: {
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
      episodeCount: true,
      id: true,
      providerName: true,
      thumbUrl: true,
      title: true,
      updatedAt: true,
    },
    take: 20,
  });
}

export async function listRecentDramaChannelBroadcasts(input?: {
  botKind?: "default" | "partner";
  limit?: number;
  ownerUserId?: string;
  partnerBotId?: string;
}) {
  return prisma.dramaChannelBroadcast.findMany({
    where: {
      ...(input?.botKind ? { botKind: input.botKind } : {}),
      ...(input?.ownerUserId ? { ownerUserId: input.ownerUserId } : {}),
      ...(input?.partnerBotId ? { partnerBotId: input.partnerBotId } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      botUsername: true,
      buttonLabel: true,
      channelUsername: true,
      createdAt: true,
      drama: {
        select: {
          id: true,
          thumbUrl: true,
          title: true,
        },
      },
      id: true,
      pinned: true,
      postedAt: true,
      telegramMessageId: true,
    },
    take: input?.limit ?? 8,
  });
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

  const drama = await prisma.drama.findUnique({
    where: { id: input.dramaId },
    select: {
      description: true,
      id: true,
      isStreamPlayable: true,
      thumbUrl: true,
      title: true,
    },
  });

  if (!drama || !drama.isStreamPlayable) {
    throw new Error("Drama untuk broadcast tidak ditemukan atau sedang disembunyikan.");
  }

  if (!drama.thumbUrl.trim()) {
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

  const draft = await prisma.dramaChannelBroadcast.create({
    data: {
      botKind: input.botKind,
      botUsername: input.botUsername.trim().replace(/^@/, ""),
      buttonLabel,
      caption,
      channelUsername: normalizedChannelUsername,
      dramaId: drama.id,
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
      photo: drama.thumbUrl,
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
