import { decryptPaymentSecret } from "@/lib/payment-crypto";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessageWithToken } from "@/lib/telegram-bot";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUserName(input: {
  name: string;
  telegramUsername?: string | null;
}) {
  return input.telegramUsername
    ? `${input.name} (@${input.telegramUsername})`
    : input.name;
}

function sanitizeTelegramError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Notifikasi Telegram gagal.";

  return message.slice(0, 500);
}

export async function notifyPartnerBotCommissionForPayment(vipPaymentId: string) {
  const commission = await prisma.affiliateCommission.findUnique({
    where: {
      vipPaymentId,
    },
    select: {
      id: true,
    },
  });

  if (!commission) {
    return;
  }

  await notifyPartnerBotCommission(commission.id);
}

export async function notifyPartnerBotCommission(commissionId: string) {
  const commission = await prisma.affiliateCommission.findUnique({
    where: {
      id: commissionId,
    },
    include: {
      partnerBot: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              telegramId: true,
              telegramUsername: true,
            },
          },
        },
      },
      referredUser: {
        select: {
          name: true,
          telegramUsername: true,
        },
      },
      vipPayment: {
        include: {
          plan: {
            select: {
              name: true,
              durationDays: true,
            },
          },
        },
      },
    },
  });

  if (
    !commission ||
    !commission.partnerBot ||
    commission.notificationSentAt ||
    commission.status !== "approved"
  ) {
    return;
  }

  if (!commission.partnerBot.isEnabled) {
    await prisma.affiliateCommission.update({
      where: {
        id: commission.id,
      },
      data: {
        notificationError: "Bot partner nonaktif saat komisi dibuat.",
      },
    });
    return;
  }

  if (!commission.partnerBot.owner.telegramId) {
    await prisma.affiliateCommission.update({
      where: {
        id: commission.id,
      },
      data: {
        notificationError:
          "Owner partner bot belum memiliki Telegram ID di akun aplikasi.",
      },
    });
    return;
  }

  try {
    const botToken = decryptPaymentSecret(
      commission.partnerBot.botTokenCiphertext,
    )?.trim();

    if (!botToken) {
      throw new Error("Token bot partner kosong.");
    }

    await sendTelegramMessageWithToken(botToken, {
      chat_id: commission.partnerBot.owner.telegramId,
      text: [
        "Komisi affiliate baru!",
        "",
        `Bot: @${commission.partnerBot.botUsername}`,
        `Pembeli: ${formatUserName(commission.referredUser)}`,
        `Paket: ${commission.vipPayment.plan.name} (${commission.vipPayment.plan.durationDays} hari)`,
        `Nilai transaksi: ${formatRupiah(commission.baseAmount)}`,
        `Komisi: ${formatRupiah(commission.amount)} (${commission.commissionRate}%)`,
        "",
        "Saldo komisi sudah tercatat di dashboard affiliate.",
      ].join("\n"),
    });

    await prisma.affiliateCommission.update({
      where: {
        id: commission.id,
      },
      data: {
        notificationSentAt: new Date(),
        notificationError: "",
      },
    });
  } catch (error) {
    await prisma.affiliateCommission.update({
      where: {
        id: commission.id,
      },
      data: {
        notificationError: sanitizeTelegramError(error),
      },
    });
  }
}
