export function buildTelegramPublicHref(value: string | null | undefined) {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();

      if (host === "t.me" || host === "www.t.me" || host === "telegram.me") {
        return url.toString();
      }
    } catch {
      return null;
    }
  }

  if (/^(t\.me|telegram\.me)\//i.test(raw)) {
    try {
      const url = new URL(`https://${raw}`);
      const host = url.hostname.toLowerCase();

      if (host === "t.me" || host === "telegram.me") {
        return url.toString();
      }
    } catch {
      return null;
    }
  }

  const username = raw.replace(/^@/, "");

  if (!/^[a-zA-Z0-9_]{4,64}$/.test(username)) {
    return null;
  }

  return `https://t.me/${username}`;
}
