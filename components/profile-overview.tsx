"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  CircleHelp,
  Download,
  Gem,
  History,
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

type ProfileOverviewProps = {
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type ProfileResponse = {
  user: {
    id: string;
    name: string;
    email: string;
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

    try {
      const cachedValue = window.sessionStorage.getItem(cacheKey);

      if (cachedValue) {
        const cachedProfile = JSON.parse(cachedValue) as ProfileResponse;
        setProfileData(cachedProfile);
        setIsLoading(false);
      }
    } catch {
      window.sessionStorage.removeItem(cacheKey);
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
        window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
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
  const initials = displayUser.name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

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
              <Badge className="border-white/12 bg-white/8 text-white">
                <Gem className="mr-2 size-3.5" />
                DramaPro VIP
              </Badge>
              <p className="text-sm leading-7 text-white/72">
                Aktifkan VIP untuk membuka semua episode, akses prioritas, dan
                pengalaman menonton tanpa batas.
              </p>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffc62d,#f2a501)] px-4 py-3 text-sm font-semibold text-[#2d1800] shadow-[0_18px_40px_rgba(255,198,45,0.22)] transition hover:brightness-105"
            >
              Aktifkan VIP
            </button>
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
