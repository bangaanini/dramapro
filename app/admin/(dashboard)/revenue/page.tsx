import Link from "next/link";
import {
  ArrowDownUp,
  Bot,
  CreditCard,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatIdr } from "@/lib/affiliate";
import { getAdminRevenueDashboard } from "@/lib/admin/revenue";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminRevenuePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatShortIdr(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `Rp${Math.round(value / 100_000) / 10}jt`;
  }

  if (abs >= 1_000) {
    return `Rp${Math.round(value / 1_000)}rb`;
  }

  return formatIdr(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function buildRevenueHref(input: { partnerSort?: string; range?: string }) {
  const params = new URLSearchParams();

  if (input.range) {
    params.set("range", input.range);
  }

  if (input.partnerSort) {
    params.set("partnerSort", input.partnerSort);
  }

  return `/admin/revenue${params.size > 0 ? `?${params.toString()}` : ""}`;
}

export default async function AdminRevenuePage(props: AdminRevenuePageProps) {
  const searchParams = await props.searchParams;
  const dashboard = await getAdminRevenueDashboard({
    partnerSort: searchParams.partnerSort,
    range: searchParams.range,
  });

  return (
    <div className="admin-dashboard-mobile min-w-0 max-w-full space-y-5 overflow-x-clip md:space-y-6">
      <section className="min-w-0 max-w-full overflow-hidden rounded-[1.65rem] border border-white/8 bg-[#171719] p-2.5 md:glass-panel md:rounded-[2rem] md:p-6">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="hidden md:block">
            <div className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <Wallet className="mr-2 size-3.5" />
              Revenue
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Revenue
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Ringkasan transaksi VIP, paket paling laku, metode pembayaran,
              dan transaksi terbaru.
            </p>
          </div>

          <RangeFilter
            activeRange={dashboard.filters.range.key}
            items={dashboard.filters.rangeOptions.map((option) => ({
              href: buildRevenueHref({
                partnerSort: dashboard.filters.partnerSort.key,
                range: option.key,
              }),
              label: option.label,
              active: option.key === dashboard.filters.range.key,
            }))}
          />
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-3">
        <MetricCard
          icon={Wallet}
          label="Total revenue"
          value={formatShortIdr(dashboard.stats.totalRevenue)}
          delta={dashboard.stats.deltas.totalRevenue}
        />
        <MetricCard
          icon={TrendingUp}
          label="Transactions"
          value={formatNumber(dashboard.stats.transactions)}
          delta={dashboard.stats.deltas.transactions}
        />
        <MetricCard
          icon={Users}
          label="Active VIP"
          value={formatNumber(dashboard.stats.activeVipUsers)}
        />
        <MetricCard
          icon={ReceiptText}
          label="Avg transaction"
          value={formatShortIdr(dashboard.stats.averageTransaction)}
        />
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Penghasilan Partner Bot
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Diurutkan berdasarkan komisi partner dalam {dashboard.filters.range.label}.
            </p>
          </div>
          <SortFilter
            items={dashboard.filters.partnerSortOptions.map((option) => ({
              href: buildRevenueHref({
                partnerSort: option.key,
                range: dashboard.filters.range.key,
              }),
              label: option.label,
              active: option.key === dashboard.filters.partnerSort.key,
            }))}
          />
        </div>

        <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
          <CardContent className="p-0">
            {dashboard.partnerBots.length > 0 ? (
              dashboard.partnerBots.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-4 border-b border-white/8 px-4 py-5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center md:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                        #{index + 1}
                      </span>
                      <Bot className="size-4 text-accent" />
                      <p className="min-w-0 truncate text-lg font-semibold text-white">
                        @{item.botUsername}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          item.isEnabled
                            ? "bg-emerald-500/10 text-emerald-100"
                            : "bg-white/6 text-[var(--muted)]",
                        )}
                      >
                        {item.isEnabled ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-[var(--muted-foreground)]">
                      Owner: {item.ownerName} <span className="mx-1">•</span>{" "}
                      {item.ownerLabel}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {formatNumber(item.referredUsers)} referral ·{" "}
                      {formatNumber(item.activeVipUsers)} VIP aktif ·{" "}
                      {formatNumber(item.transactions)} transaksi
                      {item.lastPaidAt ? (
                        <>
                          {" "}
                          · terakhir paid {formatDate(item.lastPaidAt)}
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left sm:w-[22rem]">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.42)]">
                        Penghasilan
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatIdr(item.commission)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.42)]">
                        Revenue VIP
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatIdr(item.revenue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                Belum ada partner bot untuk ditampilkan.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <RevenueListCard
          title="Revenue by Plan"
          emptyText="Belum ada revenue plan pada range ini."
          items={dashboard.revenueByPlan.map((item) => ({
            id: item.planId,
            title: item.name,
            subtitle: `${formatNumber(item.transactions)} subscription${
              item.transactions === 1 ? "" : "s"
            }`,
            value: formatShortIdr(item.revenue),
            percentage: item.percentage,
          }))}
        />

        <RevenueListCard
          title="Payment Methods"
          emptyText="Belum ada metode pembayaran pada range ini."
          items={dashboard.paymentMethods.map((item) => ({
            id: item.method,
            title: item.method,
            subtitle: `${formatNumber(item.transactions)} transaction${
              item.transactions === 1 ? "" : "s"
            }`,
            value: formatShortIdr(item.revenue),
            percentage: item.percentage,
          }))}
        />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Recent Transactions
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {formatNumber(dashboard.stats.transactions)} transaksi dalam{" "}
              {dashboard.filters.range.label}
            </p>
          </div>
          <CreditCard className="hidden size-5 text-accent md:block" />
        </div>

        <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
          <CardContent className="p-0">
            {dashboard.recentTransactions.length > 0 ? (
              dashboard.recentTransactions.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 border-b border-white/8 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 truncate text-lg font-semibold text-white md:text-base">
                        {item.userLabel}
                      </p>
                      <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
                        Paid
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-[var(--muted-foreground)]">
                      {item.planName} <span className="mx-1">•</span>{" "}
                      {item.method} <span className="mx-1">•</span>{" "}
                      {formatDate(item.paidAt)}
                    </p>
                  </div>
                  <p className="text-right text-lg font-semibold text-white">
                    {formatIdr(item.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                Belum ada transaksi paid pada range ini.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-[var(--muted-foreground)]">
        Generated:{" "}
        {new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(dashboard.generatedAt))}
      </p>
    </div>
  );
}

function RangeFilter({
  items,
}: {
  activeRange: string;
  items: Array<{ href: string; label: string; active: boolean }>;
}) {
  return (
    <div className="grid min-w-0 max-w-full grid-cols-2 overflow-hidden rounded-[1.2rem] bg-[#202023] p-1 md:min-w-[24rem]">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "min-w-0 truncate rounded-[0.95rem] px-3 py-3 text-center text-sm font-semibold transition",
            item.active
              ? "bg-[#2a2a2d] text-white md:bg-accent"
              : "text-[rgba(255,255,255,0.42)] hover:text-white",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function SortFilter({
  items,
}: {
  items: Array<{ href: string; label: string; active: boolean }>;
}) {
  return (
    <div className="grid min-w-0 max-w-full grid-cols-2 overflow-hidden rounded-[1.2rem] bg-[#202023] p-1 md:min-w-[28rem]">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "inline-flex min-w-0 items-center justify-center gap-2 truncate rounded-[0.95rem] px-3 py-3 text-center text-sm font-semibold transition",
            item.active
              ? "bg-[#2a2a2d] text-white md:bg-accent"
              : "text-[rgba(255,255,255,0.42)] hover:text-white",
          )}
        >
          <ArrowDownUp className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  delta?: number;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#171719] p-4 md:glass-panel md:rounded-[1.6rem] md:p-5">
      <div className="flex items-center gap-3">
        <Icon className="size-4 shrink-0 text-[rgba(255,255,255,0.42)]" />
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.42)]">
          {label}
        </p>
      </div>
      <div className="mt-4 flex min-w-0 items-end gap-3">
        <p className="min-w-0 truncate text-[2.15rem] font-semibold leading-none tracking-tight text-white md:text-3xl">
          {value}
        </p>
        {typeof delta === "number" ? <DeltaBadge value={delta} /> : null}
      </div>
    </div>
  );
}

function DeltaBadge({ value }: { value: number }) {
  const isPositive = value >= 0;

  return (
    <span
      className={cn(
        "mb-1 shrink-0 text-sm font-semibold",
        isPositive ? "text-emerald-300" : "text-red-300",
      )}
    >
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

function RevenueListCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    value: string;
    percentage: number;
  }>;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
        <CardContent className="p-0">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/8 px-4 py-5 last:border-b-0 md:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {item.subtitle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[rgba(255,255,255,0.42)]">
                    {item.percentage}%
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">
              {emptyText}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
