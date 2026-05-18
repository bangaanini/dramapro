"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  CircleHelp,
  Crown,
  Download,
  Gem,
  KeyRound,
  LogOut,
  LoaderCircle,
  Mail,
  UserRound,
} from "lucide-react";

import { logoutUserAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectTelegramMenu } from "@/components/connect-telegram-menu";
import { MergeCandidateBanner } from "@/components/merge-candidate-banner";
import { PushNotificationButton } from "@/components/push-notification-button";
import {
  clearStoredPwaInstallPrompt,
  getStoredPwaInstallPrompt,
  isStandaloneDisplayMode,
  markPwaInstalled,
  PWA_INSTALL_PROMPT_READY_EVENT,
  requestPwaInstallModal,
  storePwaInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";
import { safeSessionStorage } from "@/lib/safe-session-storage";
import type {
  TelegramHomeScreenEventPayload,
  TelegramHomeScreenStatus,
} from "@/lib/telegram-web-app";
import "@/lib/telegram-web-app";
import { supportsTelegramHomeScreen } from "@/lib/telegram-web-app";
import {
  getUserAvatarUrl,
  getUserInitials,
  getUserSecondaryLabel,
} from "@/lib/user-identity";
import { isVipActive } from "@/lib/vip";

type ProfileOverviewProps = {
  supportUrl: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    authProvider: "local" | "telegram";
    hasWebAccount: boolean;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramPhotoUrl: string | null;
    vipStartedAt: string | null;
    vipExpiresAt: string | null;
  };
};

type ProfileResponse = {
  user: {
    id: string;
    name: string;
    email: string | null;
    authProvider: "local" | "telegram";
    hasWebAccount: boolean;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramPhotoUrl: string | null;
    vipStartedAt: string | null;
    vipExpiresAt: string | null;
  };
  favoritesCount: number;
  historyCount: number;
};

const profileMenuItems = [
  {
    href: "/profile/setup-web",
    label: "Buat Akun Web",
    description: "Tambah email & password supaya bisa login lewat web juga.",
    icon: Mail,
    visibleWhen: "no-web-account" as const,
  },
  {
    href: "/profile/password",
    label: "Ganti Password",
    description: "Perbarui password akun dengan aman.",
    icon: KeyRound,
    visibleWhen: "has-web-account" as const,
  },
] as const;

function normalizeTelegramHomeScreenStatus(
  payload?: TelegramHomeScreenEventPayload,
): TelegramHomeScreenStatus | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  return payload.status ?? null;
}

export function ProfileOverview({ user, supportUrl }: ProfileOverviewProps) {
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [hasInstallSurface, setHasInstallSurface] = useState(false);
  const [homeScreenStatus, setHomeScreenStatus] =
    useState<TelegramHomeScreenStatus | "idle">("idle");

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `dramapro.me.profile.${user.id}`;
    const cachedProfile =
      safeSessionStorage.getJSON<ProfileResponse>(cacheKey);

    if (cachedProfile) {
      setProfileData(cachedProfile);
    }

    async function loadProfile() {
      try {
        const response = await fetch("/api/me/profile", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal memuat ringkasan profil.");
        }

        const payload = (await response.json()) as ProfileResponse;

        if (!isMounted) {
          return;
        }

        setProfileData(payload);
        safeSessionStorage.setJSON(cacheKey, payload);
      } catch {
        if (!cachedProfile) {
          setProfileData(null);
        }
      } finally {
        // profile shell already handles the transition state
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  useEffect(() => {
    const syncStoredInstallPrompt = () => {
      const storedPrompt = getStoredPwaInstallPrompt();

      if (storedPrompt) {
        setInstallPromptEvent(storedPrompt);
        setHasInstallSurface(true);
      }
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;

      storePwaInstallPrompt(promptEvent);
      setInstallPromptEvent(promptEvent);
      setHasInstallSurface(true);
    };

    syncStoredInstallPrompt();
    window.addEventListener(
      PWA_INSTALL_PROMPT_READY_EVENT,
      syncStoredInstallPrompt,
    );
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        PWA_INSTALL_PROMPT_READY_EVENT,
        syncStoredInstallPrompt,
      );
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (isStandaloneDisplayMode()) {
      setHomeScreenStatus("added");
      setHasInstallSurface(true);
    }

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    const handleDisplayModeChange = () => {
      if (isStandaloneDisplayMode()) {
        setHomeScreenStatus("added");
      }
    };

    mediaQuery?.addEventListener?.("change", handleDisplayModeChange);

    return () => {
      mediaQuery?.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    const telegramWebApp = window.Telegram?.WebApp;

    if (!telegramWebApp || !supportsTelegramHomeScreen(telegramWebApp)) {
      return;
    }

    setHasInstallSurface(true);

    const handleHomeScreenAdded = () => {
      setHomeScreenStatus("added");
      markPwaInstalled();
      setActionMessage("Shortcut Layar Drama sudah ada di layar utama.");
    };

    const handleHomeScreenChecked = (payload?: TelegramHomeScreenEventPayload) => {
      const status = normalizeTelegramHomeScreenStatus(payload);

      if (!status) {
        return;
      }

      setHomeScreenStatus(status);
    };

    const handleHomeScreenFailed = (payload?: TelegramHomeScreenEventPayload) => {
      if (payload && typeof payload !== "string" && payload.error === "UNSUPPORTED") {
        setHomeScreenStatus("unsupported");
        return;
      }

      if (isStandaloneDisplayMode()) {
        setHomeScreenStatus("added");
      }
    };

    try {
      telegramWebApp.onEvent?.("homeScreenAdded", handleHomeScreenAdded);
      telegramWebApp.onEvent?.("homeScreenChecked", handleHomeScreenChecked);
      telegramWebApp.onEvent?.("homeScreenFailed", handleHomeScreenFailed);
      telegramWebApp.checkHomeScreenStatus?.((status) => {
        setHomeScreenStatus(status);
      });
    } catch {
      setHomeScreenStatus("unsupported");
    }

    return () => {
      telegramWebApp.offEvent?.("homeScreenAdded", handleHomeScreenAdded);
      telegramWebApp.offEvent?.("homeScreenChecked", handleHomeScreenChecked);
      telegramWebApp.offEvent?.("homeScreenFailed", handleHomeScreenFailed);
    };
  }, []);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActionMessage(null);
    }, 2400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [actionMessage]);

  const displayUser = profileData?.user ?? user;
  const vipExpiresAt = displayUser.vipExpiresAt
    ? new Date(displayUser.vipExpiresAt)
    : null;
  const vipStartedAt = displayUser.vipStartedAt
    ? new Date(displayUser.vipStartedAt)
    : null;
  const hasActiveVip = isVipActive(vipExpiresAt);
  const initials = getUserInitials(displayUser.name);
  const avatarUrl = getUserAvatarUrl(displayUser);
  const secondaryLabel = getUserSecondaryLabel(displayUser);
  const vipRemainingDays = hasActiveVip && vipExpiresAt
    ? Math.max(
        1,
        Math.ceil((vipExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  const visibleProfileMenuItems = profileMenuItems.filter((item) => {
    if (item.visibleWhen === "has-web-account") {
      return displayUser.hasWebAccount;
    }
    if (item.visibleWhen === "no-web-account") {
      return !displayUser.hasWebAccount;
    }
    return true;
  });

  async function handleAddToHomescreen() {
    if (isInstalling || homeScreenStatus === "added" || isStandaloneDisplayMode()) {
      setHomeScreenStatus("added");
      setActionMessage("Shortcut Layar Drama sudah ada di layar utama.");
      return;
    }

    setIsInstalling(true);

    try {
      const telegramWebApp = window.Telegram?.WebApp;

      if (telegramWebApp && supportsTelegramHomeScreen(telegramWebApp)) {
        try {
          telegramWebApp.checkHomeScreenStatus?.((status) => {
            if (status === "added") {
              setHomeScreenStatus("added");
              setActionMessage("Shortcut Layar Drama sudah ada di layar utama.");
            }
          });

          telegramWebApp.addToHomeScreen?.();
          setActionMessage("Telegram sedang membuka pilihan add to homescreen.");
          window.setTimeout(() => {
            try {
              telegramWebApp.checkHomeScreenStatus?.((status) => {
                setHomeScreenStatus(status);

                if (status === "added") {
                  setActionMessage("Shortcut Layar Drama sudah ada di layar utama.");
                }
              });
            } catch {
              setHomeScreenStatus("unsupported");
            }
          }, 900);
        } catch {
          setHomeScreenStatus("unsupported");
        }
        return;
      }

      const promptEvent = installPromptEvent ?? getStoredPwaInstallPrompt();

      if (promptEvent) {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        const accepted = choice?.outcome === "accepted";

        if (accepted || isStandaloneDisplayMode()) {
          setHomeScreenStatus("added");
          markPwaInstalled();
        }

        setActionMessage(
          accepted
            ? "Layar Drama ditambahkan ke layar utama."
            : "Permintaan add to homescreen dibatalkan.",
        );
        clearStoredPwaInstallPrompt();
        setInstallPromptEvent(null);
        return;
      }

      setActionMessage(
        "Buka menu browser lalu pilih 'Add to Home screen' untuk menambahkan shortcut.",
      );
      requestPwaInstallModal();
    } finally {
      setIsInstalling(false);
    }
  }

  function handleSupportClick() {
    const telegramWebApp = window.Telegram?.WebApp;

    if (telegramWebApp?.openTelegramLink) {
      telegramWebApp.openTelegramLink(supportUrl);
      return;
    }

    window.open(supportUrl, "_blank", "noopener,noreferrer");
  }

  const addToHomescreenBadge =
    homeScreenStatus === "added"
      ? "Terpasang"
      : homeScreenStatus === "unsupported"
        ? "Tidak didukung"
        : homeScreenStatus === "unknown"
          ? "Tersedia"
        : homeScreenStatus === "missed"
            ? "Belum ditambah"
            : hasInstallSurface
              ? "Siap"
              : "Manual";

  return (
    <>
      <div className="mb-4">
        <MergeCandidateBanner />
      </div>
      <section className="profile-panel overflow-hidden rounded-[2rem] p-4 sm:p-5">
        <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(49,33,64,0.54),rgba(28,19,33,0.38))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full border border-white/12 bg-black/25 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayUser.name}
                    className="size-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials || <UserRound className="size-6" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{displayUser.name}</p>
                <p className="text-sm text-white/72">{secondaryLabel}</p>
              </div>
            </div>

            <form action={logoutUserAction}>
              <Button type="submit" size="sm">
                <LogOut className="mr-2 size-4" />
                Keluar
              </Button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="border-white/12 bg-black/22 px-3 py-1.5 text-white">
              {displayUser.telegramId && displayUser.hasWebAccount
                ? "Telegram + Web"
                : displayUser.telegramId
                  ? "Telegram login"
                  : "Akun web"}
            </Badge>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/18 p-4">
            <div className="space-y-2">
              <Badge
                className={
                  hasActiveVip
                    ? "border-amber-400/20 bg-amber-500/12 text-amber-100"
                    : "border-white/12 bg-white/8 text-white"
                }
              >
                {hasActiveVip ? (
                  <Crown className="mr-2 size-3.5" />
                ) : (
                  <Gem className="mr-2 size-3.5" />
                )}
                {hasActiveVip ? "Layar Drama Premium Aktif" : "Layar Drama VIP"}
              </Badge>
              <p className="text-sm leading-7 text-white/72">
                {hasActiveVip
                  ? "Akunmu sedang premium. Semua episode VIP sudah terbuka dan masa aktifmu masih berjalan."
                  : "Aktifkan VIP untuk membuka semua episode, akses prioritas, dan pengalaman menonton tanpa batas."}
              </p>
            </div>

            {hasActiveVip && vipExpiresAt ? (
              <div className="mt-4 rounded-[1.4rem] border border-amber-400/15 bg-amber-500/8 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                      Masa aktif VIP
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatLongDate(vipExpiresAt)}
                    </p>
                  </div>
                  <Badge className="border-emerald-400/20 bg-emerald-500/12 px-3 py-1.5 text-emerald-100">
                    {vipRemainingDays} hari lagi
                  </Badge>
                </div>

                {vipStartedAt ? (
                  <p className="mt-3 text-xs leading-6 text-white/56">
                    Premium aktif sejak {formatLongDate(vipStartedAt)}.
                  </p>
                ) : null}
              </div>
            ) : null}

            <Link
              href="?premium=1"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffc62d,#f2a501)] px-4 py-3 text-sm font-semibold text-[#2d1800] shadow-[0_18px_40px_rgba(255,198,45,0.22)] transition hover:brightness-105"
            >
              {hasActiveVip ? "Perpanjang VIP" : "Aktifkan VIP"}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <div className="space-y-3">
          {visibleProfileMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className="block">
                <Card className="soft-panel rounded-[1.6rem] border-white/10 transition hover:border-accent/35">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-white/45" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {displayUser.hasWebAccount && !displayUser.telegramId ? (
            <ConnectTelegramMenu />
          ) : null}

          <button
            type="button"
            onClick={() => {
              void handleAddToHomescreen();
            }}
            disabled={isInstalling || homeScreenStatus === "added"}
            className="block w-full text-left"
          >
            <Card
              className={
                "soft-panel rounded-[1.6rem] border-white/10 transition hover:border-accent/35 " +
                (homeScreenStatus === "added"
                  ? "opacity-90"
                  : "cursor-pointer")
              }
            >
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                    {isInstalling ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <Download className="size-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">Download App</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {homeScreenStatus === "added"
                        ? "Shortcut Layar Drama sudah terpasang di layar utama."
                        : "Download Layar Drama ke layar utama seperti aplikasi."}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{addToHomescreenBadge}</Badge>
              </CardContent>
            </Card>
          </button>

          <PushNotificationButton variant="card" />

          <button
            type="button"
            onClick={handleSupportClick}
            className="block w-full text-left"
          >
            <Card className="soft-panel rounded-[1.6rem] border-white/10 transition hover:border-accent/35">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                    <CircleHelp className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Bantuan</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Hubungi support Telegram jika ada kendala akun atau aplikasi.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Telegram</Badge>
              </CardContent>
            </Card>
          </button>
        </div>

        {actionMessage ? (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/82">
            {actionMessage}
          </div>
        ) : null}
      </section>
    </>
  );
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}
