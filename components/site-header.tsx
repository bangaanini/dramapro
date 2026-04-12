import Link from "next/link";
import { Clapperboard } from "lucide-react";

import { getAppSettings } from "@/lib/app-settings";
import { getCurrentUser } from "@/lib/user-auth";
import {
  getUserAvatarUrl,
  getUserInitials,
  getUserSecondaryLabel,
} from "@/lib/user-identity";

type SiteHeaderProps = {
  current?: "home" | "library" | "account" | "watch";
};

export async function SiteHeader({ current }: SiteHeaderProps) {
  void current;
  const [user, settings] = await Promise.all([getCurrentUser(), getAppSettings()]);
  const isTelegramHeader = user?.authProvider === "telegram";
  const avatarUrl = user ? getUserAvatarUrl(user) : null;
  const initials = user ? getUserInitials(user.name) : "LD";
  const secondaryLabel = user ? getUserSecondaryLabel(user) : "Layar Drama";
  const brandLogoUrl = settings.site.customLogoUrl;
  const brandName = settings.site.name;

  return (
    <header className="sticky top-0 z-50">
      <div className="soft-panel rounded-none border-x-0 border-t-0 px-3 py-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-start">
          <Link href="/" className="group flex items-center gap-3">
            {isTelegramHeader ? (
              <>
                <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-black/25 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition group-hover:scale-[1.03]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={user.name}
                      className="size-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {secondaryLabel}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="relative flex size-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-[0_14px_30px_rgba(255,122,69,0.18)] transition group-hover:scale-[1.03]">
                  {brandLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brandLogoUrl}
                      alt={brandName}
                      className="size-full rounded-2xl object-cover"
                    />
                  ) : (
                    <>
                      <span className="absolute inset-1 rounded-[1rem] bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)]" />
                      <Clapperboard className="size-4.5" />
                    </>
                  )}
                </div>
                <p className="text-base font-semibold tracking-tight text-white sm:text-lg">
                  {brandName}
                </p>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
