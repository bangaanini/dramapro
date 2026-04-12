import { Search, Trash2, Users } from "lucide-react";

import {
  deleteUserAction,
  updateUserAffiliateCommissionOverrideAction,
} from "@/app/admin/actions";
import { Prisma } from "@/app/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_AFFILIATE_SETTINGS,
  getAffiliateTier,
} from "@/lib/affiliate";
import { prisma } from "@/lib/prisma";
import { getUserSecondaryLabel } from "@/lib/user-identity";
import { isVipActive } from "@/lib/vip";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const currentPath = query
    ? `/admin/users?q=${encodeURIComponent(query)}`
    : "/admin/users";
  const userWhere: Prisma.UserWhereInput = query
    ? {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            telegramUsername: {
              contains: query.replace(/^@/, ""),
              mode: "insensitive",
            },
          },
          {
            affiliateCode: {
              contains: query.toUpperCase(),
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const [
    users,
    totalUsers,
    filteredUsers,
    activeSessions,
    activeReferralGroups,
    affiliateSettings,
  ] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        referredBy: {
          select: {
            name: true,
            email: true,
            authProvider: true,
            telegramUsername: true,
          },
        },
        _count: {
          select: {
            favorites: true,
            watchHistory: true,
            sessions: true,
            referrals: true,
          },
        },
      },
    }),
    prisma.user.count(),
    query ? prisma.user.count({ where: userWhere }) : prisma.user.count(),
    prisma.userSession.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    }),
    prisma.user.groupBy({
      by: ["referredById"],
      where: {
        referredById: {
          not: null,
        },
        vipPayments: {
          some: {
            status: "paid",
          },
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.affiliateSettings.findUnique({
      where: { id: "global" },
    }),
  ]);
  const resolvedAffiliateSettings = affiliateSettings ?? DEFAULT_AFFILIATE_SETTINGS;
  const premiumUsers = users.filter((user) => isVipActive(user.vipExpiresAt)).length;
  const activeReferralMap = new Map(
    activeReferralGroups
      .filter((item) => item.referredById)
      .map((item) => [item.referredById as string, item._count._all]),
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Users className="mr-2 size-3.5" />
          Tabel user
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Daftar User
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Monitor akun terdaftar dan status
        </p>

        <form action="/admin/users" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Cari nama, email, username Telegram, atau kode affiliate..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/24 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-accent/45"
            />
          </label>
          <Button type="submit" className="h-12 rounded-2xl px-6">
            Cari user
          </Button>
          {query ? (
            <a
              href="/admin/users"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-6 text-sm font-medium text-white transition hover:bg-white/12"
            >
              Reset
            </a>
          ) : null}
        </form>

        {saved === "commission" ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Komisi khusus user berhasil diperbarui.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <StatCard label="Total user" value={String(totalUsers)} />
          <StatCard label="User premium" value={String(premiumUsers)} />
          <StatCard label="Sesi aktif" value={String(activeSessions)} />
          <StatCard
            label={query ? "Hasil pencarian" : "Baris ditampilkan"}
            value={String(query ? filteredUsers : users.length)}
          />
        </div>
      </div>

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/4 text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-medium">User</th>
                  <th className="px-5 py-4 font-medium">Referred by</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Komisi</th>
                  <th className="px-5 py-4 font-medium">Favorit</th>
                  <th className="px-5 py-4 font-medium">Riwayat</th>
                  <th className="px-5 py-4 font-medium">Referral aktif</th>
                  <th className="px-5 py-4 font-medium">Sesi</th>
                  <th className="px-5 py-4 font-medium">Terdaftar</th>
                  <th className="px-5 py-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => {
                    const hasActiveVip = isVipActive(user.vipExpiresAt);
                    const activeReferralCount = activeReferralMap.get(user.id) ?? 0;
                    const generalTier = getAffiliateTier(
                      activeReferralCount,
                      resolvedAffiliateSettings,
                    );
                    const commissionOverride =
                      typeof user.affiliateCommissionOverrideRate === "number"
                        ? user.affiliateCommissionOverrideRate
                        : null;
                    const effectiveCommissionRate =
                      commissionOverride ?? generalTier.rate;

                    return (
                      <tr key={user.id} className="border-b border-white/6 last:border-b-0">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {getUserSecondaryLabel(user)}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {user.referredBy ? (
                            <div>
                              <p className="font-medium text-white">{user.referredBy.name}</p>
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                {getUserSecondaryLabel(user.referredBy)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <Badge className="border-white/12 bg-black/20 text-white">
                              {user.authProvider === "telegram" ? "Telegram" : "Web"}
                            </Badge>
                            <Badge
                              className={
                                hasActiveVip
                                  ? "border-amber-400/20 bg-amber-500/12 text-amber-100"
                                  : "border-white/12 bg-white/6 text-white"
                              }
                            >
                              {hasActiveVip ? "Premium" : "Free"}
                            </Badge>
                            {hasActiveVip && user.vipExpiresAt ? (
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Aktif sampai {formatDate(user.vipExpiresAt)}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-3">
                            <div>
                              <p className="font-medium text-white">
                                {effectiveCommissionRate}%
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                {commissionOverride !== null
                                  ? "Override admin"
                                  : `${generalTier.level} umum`}
                              </p>
                            </div>
                            <form
                              action={updateUserAffiliateCommissionOverrideAction}
                              className="flex items-center gap-2"
                            >
                              <input type="hidden" name="userId" value={user.id} />
                              <input
                                type="hidden"
                                name="redirectTo"
                                value={currentPath}
                              />
                              <input
                                name="affiliateCommissionOverrideRate"
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={commissionOverride ?? ""}
                                placeholder="Umum"
                                className="h-9 w-20 rounded-xl border border-white/10 bg-black/24 px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-accent/45"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="secondary"
                                className="h-9 rounded-xl px-3"
                              >
                                Simpan
                              </Button>
                            </form>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-white">{user._count.favorites}</td>
                        <td className="px-5 py-4 text-white">{user._count.watchHistory}</td>
                        <td className="px-5 py-4">
                          <p className="text-white">{activeReferralCount}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {user._count.referrals} total referral
                          </p>
                        </td>
                        <td className="px-5 py-4 text-white">{user._count.sessions}</td>
                        <td className="px-5 py-4 text-[var(--muted)]">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <form action={deleteUserAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="text-red-200 hover:bg-red-500/10 hover:text-red-100"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Hapus
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-[var(--muted)]"
                    >
                      Belum ada user terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
