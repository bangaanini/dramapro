import { Users } from "lucide-react";

import { AdminUsersTable } from "@/components/admin-users-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminUsersTableData } from "@/lib/admin-users-data";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const [initialTableData, totalUsers, premiumUsers, activeSessions] =
    await Promise.all([
      getAdminUsersTableData({
        query,
        page: 1,
        pageSize: 20,
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          vipExpiresAt: {
            gt: new Date(),
          },
        },
      }),
      prisma.userSession.count({
        where: {
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
    ]);
  const visiblePremiumUsers = initialTableData.users.filter((user) =>
    isVipActive(user.vipExpiresAt ? new Date(user.vipExpiresAt) : null),
  ).length;

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
          Monitor akun terdaftar, cari user secara langsung, atur komisi khusus,
          dan batasi tampilan dengan pagination.
        </p>

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
            label={query ? "Premium terlihat" : "Baris awal"}
            value={String(query ? visiblePremiumUsers : initialTableData.users.length)}
          />
        </div>
      </div>

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="p-0">
          <AdminUsersTable initialData={initialTableData} />
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
