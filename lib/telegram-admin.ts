import { getTelegramSettings } from "@/lib/app-settings";

export function normalizeTelegramAdminUsername(value?: string | null) {
  return (value ?? "").trim().replace(/^@/, "").toLowerCase();
}

export async function isMainTelegramAdminIdentity(input: {
  telegramId?: string | number | null;
  telegramUsername?: string | null;
}) {
  const settings = await getTelegramSettings();
  const telegramId =
    input.telegramId === null || typeof input.telegramId === "undefined"
      ? ""
      : String(input.telegramId).trim();
  const telegramUsername = normalizeTelegramAdminUsername(input.telegramUsername);

  if (telegramId && settings.adminIds.includes(telegramId)) {
    return true;
  }

  return Boolean(
    telegramUsername && settings.adminUsernames.includes(telegramUsername),
  );
}
