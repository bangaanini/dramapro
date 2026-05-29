import { getTelegramSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

/**
 * Sync Telegram admin IDs dari settings ke tabel AdminUser
 * Dipanggil saat server start atau saat settings diupdate
 */
export async function syncAdminTelegramIds() {
  const telegramSettings = await getTelegramSettings();
  const adminIds = telegramSettings.adminIds;

  if (adminIds.length === 0) {
    console.log("[Admin Telegram Sync] No admin IDs configured in settings");
    return;
  }

  console.log("[Admin Telegram Sync] Syncing admin IDs:", adminIds);

  // Ambil semua admin users
  const adminUsers = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      telegramId: true,
    },
  });

  if (adminUsers.length === 0) {
    console.log("[Admin Telegram Sync] No admin users found in database");
    return;
  }

  // Update admin pertama (primary admin) dengan Telegram ID pertama dari settings
  const primaryAdmin = adminUsers[0];
  const primaryTelegramId = adminIds[0];

  if (primaryAdmin && primaryTelegramId && primaryAdmin.telegramId !== primaryTelegramId) {
    await prisma.adminUser.update({
      where: { id: primaryAdmin.id },
      data: { telegramId: primaryTelegramId },
    });

    console.log(
      `[Admin Telegram Sync] Updated primary admin ${primaryAdmin.email} with Telegram ID: ${primaryTelegramId}`,
    );
  }

  // Jika ada lebih dari 1 admin user dan lebih dari 1 admin ID di settings,
  // update admin user lainnya dengan Telegram ID berikutnya
  for (let i = 1; i < Math.min(adminUsers.length, adminIds.length); i++) {
    const admin = adminUsers[i];
    const telegramId = adminIds[i];

    if (admin && telegramId && admin.telegramId !== telegramId) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { telegramId },
      });

      console.log(
        `[Admin Telegram Sync] Updated admin ${admin.email} with Telegram ID: ${telegramId}`,
      );
    }
  }

  console.log("[Admin Telegram Sync] Sync completed");
}
