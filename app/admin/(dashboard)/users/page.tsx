import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminUsersPage() {
  const [users, totalUsers, activeSessions, activeReferralGroups] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
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
  ]);
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
          Monitor akun terdaftar, jumlah favorit, riwayat tontonan, dan sesi aktif
          pengguna dari satu tabel admin.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <StatCard label="Total user" value={String(totalUsers)} />
          <StatCard label="User premium" value={String(premiumUsers)} />
          <StatCard label="Sesi aktif" value={String(activeSessions)} />
          <StatCard
            label="Baris ditampilkan"
            value={String(users.length)}
          />
        </div>
      </div>

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/4 text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-medium">User</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Favorit</th>
                  <th className="px-5 py-4 font-medium">Riwayat</th>
                  <th className="px-5 py-4 font-medium">Referral aktif</th>
                  <th className="px-5 py-4 font-medium">Sesi</th>
                  <th className="px-5 py-4 font-medium">Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => {
                    const hasActiveVip = isVipActive(user.vipExpiresAt);
                    const activeReferralCount = activeReferralMap.get(user.id) ?? 0;

                    return (
                      <tr key={user.id} className="border-b border-white/6 last:border-b-0">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2">
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
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
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
