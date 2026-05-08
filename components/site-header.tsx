import Link from "next/link";
import Image from "next/image";
import { type ReactNode } from "react";
import {
  CircleHelp,
  Clapperboard,
  Crown,
  KeyRound,
  LibraryBig,
  LogIn,
  LogOut,
  Megaphone,
  MessageCircle,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";

import { logoutUserAction } from "@/app/auth/actions";
import { HeaderSearchForm } from "@/components/header-search-form";
import { HeaderInstallAppButton } from "@/components/header-install-app-button";
import { PushNotificationButton } from "@/components/push-notification-button";
import mobileHeaderLogo from "@/2.png";
import { getAppSettings } from "@/lib/app-settings";
import { getCurrentUser } from "@/lib/user-auth";
import {
  getUserAvatarUrl,
  getUserInitials,
  getUserSecondaryLabel,
} from "@/lib/user-identity";
import { isVipActive } from "@/lib/vip";

type SiteHeaderProps = {
  current?: "home" | "library" | "account" | "watch";
};

export async function SiteHeader({ current }: SiteHeaderProps) {
  void current;
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getAppSettings(),
  ]);
  const avatarUrl = user ? getUserAvatarUrl(user) : null;
  const initials = user ? getUserInitials(user.name) : "LD";
  const secondaryLabel = user ? getUserSecondaryLabel(user) : "Guest";
  const brandLogoUrl = settings.site.customLogoUrl;
  const brandName = settings.site.name;
  const hasActiveVip = isVipActive(user?.vipExpiresAt);
  const telegramBotUsername = settings.telegram.botUsername?.trim().replace(/^@/, "");
  const telegramHref = telegramBotUsername
    ? `https://t.me/${telegramBotUsername}`
    : settings.telegram.supportUrl || "/profile";
  const supportHref = settings.telegram.supportUrl || telegramHref;

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#080504]/92 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 w-full max-w-[1580px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-3">
          <Image
            src={mobileHeaderLogo}
            alt={brandName}
            priority
            className="h-12 w-auto max-w-[150px] object-contain transition group-hover:scale-[1.02] sm:hidden"
            sizes="150px"
          />
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogoUrl}
              alt={brandName}
              className="hidden h-20 w-auto max-w-[170px] object-contain transition group-hover:scale-[1.02] sm:block sm:h-18 sm:max-w-[220px]"
            />
          ) : (
            <>
              <div className="relative hidden size-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-[0_14px_30px_rgba(255,122,69,0.18)] transition group-hover:scale-[1.03] sm:flex">
                <span className="absolute inset-1 rounded-[1rem] bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)]" />
                <Clapperboard className="size-5" />
              </div>
              <p className="hidden truncate text-base font-semibold tracking-tight text-white sm:block sm:text-lg">
                {brandName}
              </p>
            </>
          )}
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <HeaderSearchForm />

          <Link
            href="/search"
            prefetch
            aria-label="Cari drama"
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/78 transition hover:border-accent/35 hover:bg-white/12 lg:hidden"
          >
            <Search className="size-5" />
          </Link>

          {!hasActiveVip ? (
            <Link
              href="?premium=1"
              prefetch
              className="hidden h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(255,122,69,0.34)] transition hover:brightness-110 active:scale-[0.985] sm:inline-flex"
            >
              <Crown className="size-4.5" />
              <span>Upgrade ke Premium</span>
            </Link>
          ) : null}

          <div className="group relative">
            <button
              type="button"
              className="flex size-12 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-white/8 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.2)] transition hover:border-accent/35 hover:bg-white/12"
              aria-label="Buka menu profil"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={user?.name ?? "Profil"}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : user ? (
                initials
              ) : (
                <UserRound className="size-6" />
              )}
            </button>

            <div className="invisible absolute right-0 top-full z-50 mt-3 w-[min(86vw,320px)] translate-y-2 rounded-2xl border border-white/10 bg-[#0b0808]/96 p-2 opacity-0 shadow-[0_26px_80px_rgba(0,0,0,0.58)] backdrop-blur-2xl transition duration-180 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="mb-1 rounded-xl border border-white/8 bg-white/[0.045] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-bold text-white">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={user?.name ?? "Profil"}
                        className="size-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : user ? (
                      initials
                    ) : (
                      <UserRound className="size-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">
                      {user?.name ?? "Guest"}
                    </p>
                    <p className="truncate text-sm text-white/58">
                      {user ? secondaryLabel : "Masuk untuk menyimpan koleksi"}
                    </p>
                  </div>
                </div>
              </div>

              {user ? (
                <>
                  <HeaderMenuLink href="/library" label="Koleksiku">
                    <LibraryBig className="size-4.5" />
                  </HeaderMenuLink>
                  <HeaderMenuLink
                    href="?premium=1"
                    label={hasActiveVip ? "Perpanjang Premium" : "Upgrade ke Premium"}
                    emphasized={!hasActiveVip}
                  >
                    <Crown className="size-4.5" />
                  </HeaderMenuLink>
                  <HeaderMenuLink href="/affiliate" label="Program Affiliate">
                    <Megaphone className="size-4.5" />
                  </HeaderMenuLink>
                  <HeaderInstallAppButton />
                  <PushNotificationButton />
                  <HeaderMenuLink href={telegramHref} label="Buka di Telegram" external>
                    <MessageCircle className="size-4.5" />
                  </HeaderMenuLink>
                  {user.authProvider === "local" ? (
                    <HeaderMenuLink href="/profile/password" label="Ganti Password">
                      <KeyRound className="size-4.5" />
                    </HeaderMenuLink>
                  ) : null}
                  <HeaderMenuLink href={supportHref} label="Bantuan" external>
                    <CircleHelp className="size-4.5" />
                  </HeaderMenuLink>
                  <form action={logoutUserAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white"
                    >
                      <LogOut className="size-4.5" />
                      <span>Keluar</span>
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <HeaderMenuLink href="?auth=sign-in" label="Masuk">
                    <LogIn className="size-4.5" />
                  </HeaderMenuLink>
                  <HeaderMenuLink href="?auth=sign-up" label="Daftar akun">
                    <UserPlus className="size-4.5" />
                  </HeaderMenuLink>
                  <HeaderMenuLink href="?premium=1" label="Upgrade ke Premium" emphasized>
                    <Crown className="size-4.5" />
                  </HeaderMenuLink>
                  <HeaderInstallAppButton />
                  <PushNotificationButton />
                  <HeaderMenuLink href={supportHref} label="Bantuan" external>
                    <CircleHelp className="size-4.5" />
                  </HeaderMenuLink>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderMenuLink({
  href,
  label,
  children,
  emphasized = false,
  external = false,
}: {
  href: string;
  label: string;
  children: ReactNode;
  emphasized?: boolean;
  external?: boolean;
}) {
  const className = emphasized
    ? "flex w-full items-center gap-3 rounded-xl bg-accent-soft px-3 py-3 text-sm font-semibold text-accent transition hover:bg-accent/18"
    : "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-white";

  if (external && /^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <Link href={href} prefetch className={className}>
      {children}
      <span>{label}</span>
    </Link>
  );
}
