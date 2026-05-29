export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncAdminTelegramIds } = await import("@/lib/admin-telegram-sync");

    // Sync admin Telegram IDs saat server start
    await syncAdminTelegramIds().catch((error) => {
      console.error("[Instrumentation] Failed to sync admin Telegram IDs:", error);
    });
  }
}
