import { CalendarDays, CreditCard, Crown, Eye, UserRound, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { getPartnerBotUsersDashboard } from "@/lib/partner-bot-users";
import {
  getUserAvatarUrl,
  getUserInitials,
  getUserSecondaryLabel,
} from "@/lib/user-identity";
import { cn } from "@/lib/utils";
import { isVipActive } from "@/lib/vip";

type PartnerBotUsersData = Awaited<
  ReturnType<typeof getPartnerBotUsersDashboard>
>;

type PartnerBotUsersProps = {
  botUsername: string;
  dashboard: PartnerBotUsersData;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function PartnerBotUsers({
  botUsername,
  dashboard,
}: PartnerBotUsersProps) {
  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip md:space-y-6">
      <section className="min-w-0 max-w-full overflow-hidden rounded-[1.65rem] border border-white/8 bg-[#171719] p-4 md:glass-panel md:rounded-[2rem] md:p-6">
        <div className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          <Users className="mr-2 size-3.5" />
          Partner users
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Users @{botUsername}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Daftar user yang masuk melalui bot partner ini. Data diambil dari
          attribution referral bot partner.
        </p>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total users"
          value={dashboard.stats.totalUsers}
          hint="Semua user bot ini"
          featured
        />
        <MetricCard
          icon={Crown}
          label="Active VIP"
          value={dashboard.stats.activeVipUsers}
          hint="VIP masih aktif"
        />
        <MetricCard
          icon={CalendarDays}
          label="New users"
          value={dashboard.stats.newUsers}
          hint="7 hari terakhir"
        />
        <MetricCard
          icon={CreditCard}
          label="Paid users"
          value={dashboard.stats.paidUsers}
          hint="Pernah transaksi"
        />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent Users</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Menampilkan 100 user terbaru dari bot partner ini.
            </p>
          </div>
          <UserRound className="hidden size-5 text-accent md:block" />
        </div>

        <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
          <CardContent className="p-0">
            {dashboard.recentUsers.length > 0 ? (
              dashboard.recentUsers.map((user) => (
                <UserRow key={user.id} user={user} />
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                Belum ada user yang tercatat dari bot partner ini.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  featured = false,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#171719] p-4 md:glass-panel md:rounded-[1.6rem] md:p-5",
        featured && "col-span-2 xl:col-span-1",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.42)]">
          {label}
        </p>
        <span className="inline-flex size-8 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-accent md:size-9">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-[2.15rem] font-semibold leading-none tracking-tight text-white md:text-3xl">
        {formatNumber(value)}
      </p>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">{hint}</p>
    </div>
  );
}

function UserRow({
  user,
}: {
  user: PartnerBotUsersData["recentUsers"][number];
}) {
  const avatarUrl = getUserAvatarUrl(user);
  const initials = getUserInitials(user.name) || "U";
  const hasActiveVip = isVipActive(
    user.vipExpiresAt ? new Date(user.vipExpiresAt) : null,
  );

  return (
    <div className="grid gap-3 border-b border-white/8 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/8 text-sm font-semibold text-white">
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
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-lg font-semibold text-white md:text-base">
              {user.name}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                hasActiveVip
                  ? "bg-accent text-white"
                  : "border border-white/10 bg-white/6 text-white/62",
              )}
            >
              {hasActiveVip ? "VIP" : "Free"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
            {getUserSecondaryLabel(user)} <span className="mx-1">-</span>{" "}
            Join {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-right sm:min-w-[11rem]">
        <UserMiniStat
          icon={CreditCard}
          label="Paid"
          value={user.paidTransactions}
        />
        <UserMiniStat
          icon={Eye}
          label="Watch"
          value={user.watchedSeries}
        />
      </div>
    </div>
  );
}

function UserMiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/18 px-3 py-2">
      <div className="flex items-center justify-end gap-1.5 text-[rgba(255,255,255,0.42)]">
        <Icon className="size-3.5" />
        <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}
