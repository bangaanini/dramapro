import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram-bot";

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

function resolvePaymentSource(input: {
  partnerBotUsername?: string | null;
  userTelegramUsername?: string | null;
}) {
  if (input.partnerBotUsername) {
    return `Partner Bot (@${input.partnerBotUsername})`;
  }

  if (input.userTelegramUsername) {
    return "Mini App Bot Utama";
  }

  return "Web";
}

export async function notifyAdminForPayment(vipPaymentId: string) {
  console.log("[Admin Notification] Starting for payment:", vipPaymentId);

  const payment = await prisma.vipPayment.findUnique({
    where: {
      id: vipPaymentId,
    },
    include: {
      user: {
        select: {
          name: true,
          telegramUsername: true,
          referredByPartnerBot: {
            select: {
              botUsername: true,
            },
          },
        },
      },
      plan: {
        select: {
          name: true,
          durationDays: true,
        },
      },
    },
  });

  console.log("[Admin Notification] Payment found:", {
    id: payment?.id,
    status: payment?.status,
    adminNotificationSentAt: payment?.adminNotificationSentAt,
  });

  if (!payment || payment.status !== "paid" || payment.adminNotificationSentAt) {
    console.log("[Admin Notification] Skipping - payment not eligible");
    return;
  }

  const adminUsers = await prisma.adminUser.findMany({
    where: {
      telegramId: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      telegramId: true,
    },
  });

  console.log("[Admin Notification] Admin users found:", adminUsers.length);
  console.log("[Admin Notification] Admin details:", adminUsers);

  if (adminUsers.length === 0) {
    console.log("[Admin Notification] No admin with telegramId found");
    await prisma.vipPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        adminNotificationError: "Tidak ada admin dengan Telegram ID.",
      },
    });
    return;
  }

  const source = resolvePaymentSource({
    partnerBotUsername: payment.user.referredByPartnerBot?.botUsername,
    userTelegramUsername: payment.user.telegramUsername,
  });

  const message = [
    "💰 Transaksi VIP Baru!",
    "",
    `Sumber: ${source}`,
    `Pembeli: ${formatUserName(payment.user)}`,
    `Paket: ${payment.plan.name} (${payment.plan.durationDays} hari)`,
    `Nominal: ${formatRupiah(payment.amount)}`,
    `Metode: ${payment.channelName || payment.channelCode}`,
    `Ref ID: ${payment.referenceId}`,
    "",
    `Status: PAID ✅`,
  ].join("\n");

  console.log("[Admin Notification] Message to send:", message);

  const errors: string[] = [];

  for (const admin of adminUsers) {
    try {
      console.log("[Admin Notification] Sending to admin:", admin.name, admin.telegramId);
      await sendTelegramMessage({
        chat_id: admin.telegramId!,
        text: message,
      });
      console.log("[Admin Notification] Sent successfully to:", admin.name);
    } catch (error) {
      console.error("[Admin Notification] Error sending to:", admin.name, error);
      errors.push(`${admin.name}: ${sanitizeTelegramError(error)}`);
    }
  }

  await prisma.vipPayment.update({
    where: {
      id: payment.id,
    },
    data: {
      adminNotificationSentAt: errors.length === 0 ? new Date() : null,
      adminNotificationError: errors.length > 0 ? errors.join("; ") : "",
    },
  });

  console.log("[Admin Notification] Completed. Errors:", errors.length);
}
