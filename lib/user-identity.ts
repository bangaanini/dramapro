import { getSiteUrl } from "@/lib/site";

export type UserIdentityLike = {
  id?: string;
  name: string;
  email?: string | null;
  authProvider?: "local" | "telegram" | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  telegramPhotoUrl?: string | null;
  telegramFirstName?: string | null;
  telegramLastName?: string | null;
};

export function getUserInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function getUserSecondaryLabel(
  user: Pick<UserIdentityLike, "email" | "telegramUsername" | "authProvider">,
) {
  const email = user.email?.trim();

  if (email) {
    return email;
  }

  if (user.telegramUsername?.trim()) {
    return `@${user.telegramUsername.trim()}`;
  }

  if (user.authProvider === "telegram") {
    return "Akun Telegram";
  }

  return "Akun DramaPro";
}

export function getUserAvatarUrl(
  user: Pick<UserIdentityLike, "telegramPhotoUrl">,
) {
  return user.telegramPhotoUrl?.trim() || null;
}

export function buildTelegramDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const fullName = [input.firstName?.trim(), input.lastName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (input.username?.trim()) {
    return `@${input.username.trim()}`;
  }

  return "Pengguna Telegram";
}

export function resolveUserPaymentEmail(
  user: Pick<UserIdentityLike, "email" | "telegramId" | "id">,
) {
  const email = user.email?.trim();

  if (email) {
    return email;
  }

  const siteHost = new URL(getSiteUrl()).host.replace(/:\d+$/, "");
  const identity = user.telegramId?.trim() || user.id || "guest";

  return `telegram-${identity}@${siteHost}`;
}
