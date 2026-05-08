import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  History,
  ListChecks,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { requestPartnerBotWithdrawalAction } from "@/app/affiliate/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatIdr } from "@/lib/affiliate";
import type { getPartnerBotBalanceDashboard } from "@/lib/partner-bot-revenue";
import { cn } from "@/lib/utils";

type PartnerBotBalanceData = Awaited<
  ReturnType<typeof getPartnerBotBalanceDashboard>
>;

type PartnerBotBalanceProps = {
  botUsername: string;
  dashboard: PartnerBotBalanceData;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildBalanceViewHref(botUsername: string, view: string) {
  return `/affiliate/partner-bot/${botUsername}?${new URLSearchParams({
    tab: "balance",
    balanceView: view,
  }).toString()}`;
}

export function PartnerBotBalance({
  botUsername,
  dashboard,
}: PartnerBotBalanceProps) {
  const requestWithdrawalAction =
    requestPartnerBotWithdrawalAction.bind(null, botUsername);
  const canRequestWithdrawal =
    dashboard.hasPayoutProfile &&
    dashboard.stats.availableBalance >= dashboard.settings.minimumWithdrawalAmount;
  const balanceTabs = [
    { key: "overview", label: "Overview" },
    { key: "history", label: "History" },
    { key: "ledger", label: "Ledger" },
  ];

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip md:space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <BalanceCard
          icon={Wallet}
          label="Available"
          value={formatIdr(dashboard.stats.availableBalance)}
        />
        <BalanceCard
          icon={Clock3}
          label="Pending"
          value={formatIdr(dashboard.stats.pendingBalance)}
        />
        <BalanceCard
          icon={TrendingUp}
          label="Withdrawable"
          value={formatIdr(dashboard.stats.withdrawableBalance)}
        />
        <BalanceCard
          icon={CheckCircle2}
          label="Withdrawn"
          value={formatIdr(dashboard.stats.withdrawnBalance)}
        />
      </section>

      <div className="space-y-3">
        <form action={requestWithdrawalAction}>
          <FormSubmitButton
            type="submit"
            disabled={!canRequestWithdrawal}
            idleLabel="Request Withdrawal"
            pendingLabel="Mengajukan..."
            className="h-14 w-full rounded-[1.2rem] bg-accent text-base font-semibold text-white shadow-[0_18px_42px_rgba(212,0,98,0.28)] hover:bg-accent-strong"
          />
        </form>
        <p className="text-center text-xs leading-5 text-[var(--muted-foreground)]">
          {dashboard.hasPayoutProfile
            ? `Minimum withdraw ${formatIdr(dashboard.settings.minimumWithdrawalAmount)}.`
            : "Lengkapi payout default di profil sebelum request withdrawal."}
        </p>
      </div>

      <nav className="grid grid-cols-3 overflow-hidden rounded-[1.25rem] bg-[#202023] p-1">
        {balanceTabs.map((item) => (
          <Link
            key={item.key}
            href={buildBalanceViewHref(botUsername, item.key)}
            className={cn(
              "rounded-[1rem] px-3 py-3 text-center text-sm font-semibold transition",
              dashboard.activeView === item.key
                ? "bg-black text-white"
                : "text-[rgba(255,255,255,0.42)] hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {dashboard.activeView === "overview" ? (
        <OverviewPanel dashboard={dashboard} />
      ) : dashboard.activeView === "history" ? (
        <HistoryPanel items={dashboard.recentWithdrawals} />
      ) : (
        <LedgerPanel items={dashboard.ledger} />
      )}
    </div>
  );
}

function BalanceCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.35rem] border border-white/8 bg-[#171719] p-4 md:glass-panel md:rounded-[1.6rem] md:p-5">
      <div className="flex items-center gap-3">
        <Icon className="size-4 shrink-0 text-[rgba(255,255,255,0.42)]" />
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.42)]">
          {label}
        </p>
      </div>
      <p className="mt-4 truncate text-[1.9rem] font-semibold leading-none tracking-tight text-white sm:text-[2.2rem]">
        {value}
      </p>
    </div>
  );
}

function OverviewPanel({ dashboard }: { dashboard: PartnerBotBalanceData }) {
  const rows = [
    {
      label: "Total Received",
      value: formatIdr(dashboard.stats.totalReceived),
    },
    {
      label: "Platform Fees",
      value: formatIdr(dashboard.stats.platformFees),
    },
    {
      label: "Total Withdrawn",
      value: formatIdr(dashboard.stats.withdrawnBalance),
    },
    {
      label: "Pending Withdrawals",
      value: String(dashboard.stats.pendingWithdrawals),
    },
    {
      label: "Last Payment",
      value: formatDate(dashboard.stats.lastPaymentAt),
    },
    {
      label: "Last Withdrawal",
      value: formatDate(dashboard.stats.lastWithdrawalAt),
    },
  ];

  return (
    <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#050505] md:glass-panel md:rounded-[2rem]">
      <CardContent className="p-0">
        {rows.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-5 last:border-b-0 md:px-5"
          >
            <p className="text-sm font-medium text-[rgba(255,255,255,0.44)]">
              {item.label}
            </p>
            <p className="text-right text-base font-semibold text-white">
              {item.value}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HistoryPanel({
  items,
}: {
  items: PartnerBotBalanceData["recentWithdrawals"];
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
      <CardContent className="p-0">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-5 last:border-b-0 md:px-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-accent" />
                  <p className="font-semibold text-white">{formatIdr(item.amount)}</p>
                </div>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {formatDate(item.reviewedAt ?? item.requestedAt)}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold capitalize text-white">
                {item.status}
              </span>
            </div>
          ))
        ) : (
          <EmptyState text="Belum ada riwayat withdrawal untuk bot ini." />
        )}
      </CardContent>
    </Card>
  );
}

function LedgerPanel({ items }: { items: PartnerBotBalanceData["ledger"] }) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
      <CardContent className="p-0">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 border-b border-white/8 px-4 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <ListChecks className="size-4 shrink-0 text-accent" />
                  <p className="min-w-0 truncate font-semibold text-white">
                    {item.userLabel}
                  </p>
                </div>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {item.planName} - {item.commissionRate}% -{" "}
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">{formatIdr(item.amount)}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  dari {formatIdr(item.baseAmount)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState text="Belum ada ledger komisi untuk bot ini." />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}
