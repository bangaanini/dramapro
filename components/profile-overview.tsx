"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  CircleHelp,
  Crown,
  Download,
  Gem,
  History,
  Megaphone,
  KeyRound,
  LogOut,
  LoaderCircle,
  Star,
  UserRound,
} from "lucide-react";

import { logoutUserAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { safeSessionStorage } from "@/lib/safe-session-storage";
import { isVipActive } from "@/lib/vip";

type ProfileOverviewProps = {
  user: {
    id: string;
    name: string;
    email: string;
    vipStartedAt: string | null;
    vipExpiresAt: string | null;
  };
};

type ProfileResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    vipStartedAt: string | null;
    vipExpiresAt: string | null;
  };
  favoritesCount: number;
  historyCount: number;
};

const profileMenuItems = [
  {
    href: "/history",
    label: "Riwayat Tontonan",
    description: "Lihat episode terakhir yang kamu putar.",
    icon: History,
  },
  {
    href: "/favorites",
    label: "Daftar Favorit",
    description: "Semua drama yang kamu simpan.",
    icon: Star,
  },
  {
    href: "/profile/password",
    label: "Ganti Password",
    description: "Perbarui password akun dengan aman.",
    icon: KeyRound,
  },
  {
    href: "/affiliate",
    label: "Program Affiliate",
    description: "Bagikan link referral dan pantau komisi.",
    icon: Megaphone,
  },
] as const;

const secondaryMenuItems = [
  {
    label: "Download App",
    description: "Versi aplikasi mobile akan segera hadir.",
    icon: Download,
  },
  {
    label: "Bantuan",
    description: "Hubungi admin jika ada kendala akun atau playback.",
    icon: CircleHelp,
  },
] as const;

export function ProfileOverview({ user }: ProfileOverviewProps) {
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `dramapro.me.profile.${user.id}`;
    const cachedProfile =
      safeSessionStorage.getJSON<ProfileResponse>(cacheKey);

    if (cachedProfile) {
      setProfileData(cachedProfile);
      setIsLoading(false);
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const displayUser = profileData?.user ?? user;
  const favoritesCount = profileData?.favoritesCount ?? 0;
  const historyCount = profileData?.historyCount ?? 0;
  const vipExpiresAt = displayUser.vipExpiresAt
    ? new Date(displayUser.vipExpiresAt)
    : null;
  const vipStartedAt = displayUser.vipStartedAt
    ? new Date(displayUser.vipStartedAt)
    : null;
  const hasActiveVip = isVipActive(vipExpiresAt);
  const initials = displayUser.name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const vipRemainingDays = hasActiveVip && vipExpiresAt
    ? Math.max(
        1,
        Math.ceil((vipExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  return (
    <>
      <section className="profile-panel overflow-hidden rounded-[2rem] p-4 sm:p-5">
        <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(49,33,64,0.54),rgba(28,19,33,0.38))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full border border-white/12 bg-black/25 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                {initials || <UserRound className="size-6" />}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{displayUser.name}</p>
                <p className="text-sm text-white/72">{displayUser.email}</p>
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
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Memuat favorit
                </span>
              ) : (
                `${favoritesCount} favorit`
              )}
            </Badge>
            <Badge className="border-white/12 bg-black/22 px-3 py-1.5 text-white">
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Memuat riwayat
                </span>
              ) : (
                `${historyCount} riwayat`
              )}
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
                {hasActiveVip ? "DramaPro Premium Aktif" : "DramaPro VIP"}
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
              href="/vip?next=/profile"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffc62d,#f2a501)] px-4 py-3 text-sm font-semibold text-[#2d1800] shadow-[0_18px_40px_rgba(255,198,45,0.22)] transition hover:brightness-105"
            >
              {hasActiveVip ? "Perpanjang VIP" : "Aktifkan VIP"}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <div className="space-y-3">
          {profileMenuItems.map((item) => {
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

          {secondaryMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.label} className="soft-panel rounded-[1.6rem] border-white/10">
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
                  <Badge variant="secondary">Soon</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
