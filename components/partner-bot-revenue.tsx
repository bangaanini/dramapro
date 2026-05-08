import Link from "next/link";
import {
  CreditCard,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatIdr } from "@/lib/affiliate";
import type { getPartnerBotRevenueDashboard } from "@/lib/partner-bot-revenue";
import { cn } from "@/lib/utils";

type PartnerBotRevenueData = Awaited<
  ReturnType<typeof getPartnerBotRevenueDashboard>
>;

type PartnerBotRevenueProps = {
  botUsername: string;
  dashboard: PartnerBotRevenueData;
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

function buildRangeHref(botUsername: string, range: string) {
  return `/affiliate/partner-bot/${botUsername}?${new URLSearchParams({
    tab: "revenue",
    range,
  }).toString()}`;
}

export function PartnerBotRevenue({
  botUsername,
  dashboard,
}: PartnerBotRevenueProps) {
  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip md:space-y-6">
      <section className="min-w-0 max-w-full overflow-hidden rounded-[1.65rem] border border-white/8 bg-[#171719] p-3 md:glass-panel md:rounded-[2rem] md:p-6">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <Wallet className="mr-2 size-3.5" />
              Partner revenue
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Revenue @{botUsername}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Transaksi VIP dan komisi dari user yang masuk lewat bot partner
              ini.
            </p>
          </div>

          <RangeFilter
            items={dashboard.filters.rangeOptions.map((option) => ({
              href: buildRangeHref(botUsername, option.key),
              label: option.label,
              active: option.key === dashboard.filters.range.key,
            }))}
          />
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-5">
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
          icon={ReceiptText}
          label="Total komisi"
          value={formatShortIdr(dashboard.stats.totalCommission)}
        />
        <MetricCard
          icon={Users}
          label="Active VIP"
          value={formatNumber(dashboard.stats.activeVipUsers)}
        />
        <MetricCard
          icon={CreditCard}
          label="Avg transaction"
          value={formatShortIdr(dashboard.stats.averageTransaction)}
        />
      </section>

      <section className="space-y-5">
        <RevenueListCard
          title="Revenue by Plan"
          emptyText="Belum ada revenue plan pada range ini."
          items={dashboard.revenueByPlan.map((item) => ({
            id: item.planId,
            title: item.name,
            subtitle: `${formatNumber(item.transactions)} transaksi`,
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
            subtitle: `${formatNumber(item.transactions)} transaksi`,
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
                      {item.planName} <span className="mx-1">-</span>{" "}
                      {item.method} <span className="mx-1">-</span>{" "}
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
    </div>
  );
}

function RangeFilter({
  items,
}: {
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
        <p className="min-w-0 truncate text-[2rem] font-semibold leading-none tracking-tight text-white md:text-3xl">
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
