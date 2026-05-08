import Link from "next/link";
import {
  Activity,
  Clock3,
  Eye,
  Film,
  Globe2,
  MonitorSmartphone,
  Radio,
  Repeat2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminAnalyticsDashboard } from "@/lib/admin/analytics";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminAnalyticsDashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function buildFilterHref(input: {
  range: string;
  source: string;
  nextRange?: string;
  nextSource?: string;
}) {
  const params = new URLSearchParams({
    range: input.nextRange ?? input.range,
    source: input.nextSource ?? input.source,
  });

  return `/admin/dashboard?${params.toString()}`;
}

export default async function AdminAnalyticsDashboardPage(
  props: AdminAnalyticsDashboardPageProps,
) {
  const searchParams = await props.searchParams;
  const dashboard = await getAdminAnalyticsDashboard({
    range: searchParams.range,
    source: searchParams.source,
  });

  return (
    <div className="admin-dashboard-mobile min-w-0 max-w-full space-y-5 overflow-x-clip md:space-y-6">
      <section className="min-w-0 max-w-full overflow-hidden rounded-[1.65rem] border border-white/8 bg-[#171719] p-2.5 md:glass-panel md:rounded-[2rem] md:p-6">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="hidden md:block">
            <Badge className="border-accent/30 bg-accent-soft text-accent">
              <Activity className="mr-2 size-3.5" />
              Analytics
            </Badge>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Statistik first-party untuk browser dan Telegram Mini App. Video
              views dihitung saat episode benar-benar mulai diputar.
            </p>
          </div>

          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:min-w-[30rem]">
            <FilterGroup
              label="Range"
              items={dashboard.filters.rangeOptions.map((option) => ({
                href: buildFilterHref({
                  range: dashboard.filters.range.key,
                  source: dashboard.filters.source.key,
                  nextRange: option.key,
                }),
                label: option.label,
                active: option.key === dashboard.filters.range.key,
              }))}
            />
            <FilterGroup
              label="Source"
              items={dashboard.filters.sourceOptions.map((option) => ({
                href: buildFilterHref({
                  range: dashboard.filters.range.key,
                  source: dashboard.filters.source.key,
                  nextSource: option.key,
                }),
                label: option.label,
                active: option.key === dashboard.filters.source.key,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard
          label="Online now"
          value={dashboard.stats.onlineNow}
          hint="Aktif 5 menit terakhir"
          icon={Activity}
          featured
        />
        <MetricCard
          label="Total users"
          value={dashboard.stats.totalUsers}
          hint="Akun terdaftar"
          icon={Users}
        />
        <MetricCard
          label="New users"
          value={dashboard.stats.newUsers}
          hint={`Dalam ${dashboard.filters.range.label}`}
          icon={Clock3}
        />
        <MetricCard
          label="Total views"
          value={dashboard.stats.totalViews}
          hint="Video play"
          icon={Eye}
        />
        <MetricCard
          label="Total series"
          value={dashboard.stats.totalSeries}
          hint="Visible catalog"
          icon={Film}
        />
      </section>

      <BreakdownCard
        title="Platform"
        description="Source session: browser atau Telegram Mini App."
        icon={Radio}
        items={dashboard.breakdowns.platforms}
        compact
      />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <SectionHeader
              icon={Repeat2}
              title="Engagement"
              description="Session ringkas dari browser dan Telegram."
            />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat
                label="Total sessions"
                value={dashboard.engagement.totalSessions}
              />
              <MiniStat
                label="Returning sessions"
                value={dashboard.engagement.returningSessions}
              />
              <MiniStat
                label="Returning rate"
                value={`${dashboard.engagement.returningRate}%`}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">
              Page views: {formatNumber(dashboard.engagement.totalPageViews)}.
              Angka ini disimpan untuk audit, sedangkan Total views memakai video
              play.
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-[#171719] md:glass-panel md:rounded-[2rem]">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <SectionHeader
              icon={Activity}
              title="Retention"
              description="Cohort visitor yang kembali hari ini."
            />
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {dashboard.retention.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.2rem] border border-white/8 bg-black/20 p-3 sm:rounded-[1.4rem] sm:p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {item.rate}%
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {formatNumber(item.returningVisitors)}/
                    {formatNumber(item.cohortVisitors)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <BreakdownCard
          title="Device type"
          description="Session berdasarkan perangkat."
          icon={MonitorSmartphone}
          items={dashboard.breakdowns.deviceTypes}
        />
        <BreakdownCard
          title="Operating system"
          description="OS dari user-agent."
          icon={MonitorSmartphone}
          items={dashboard.breakdowns.operatingSystems}
        />
        <BreakdownCard
          title="Browser"
          description="Browser atau WebView utama."
          icon={MonitorSmartphone}
          items={dashboard.breakdowns.browsers}
        />
        <BreakdownCard
          title="Countries"
          description="Dari header proxy atau Cloudflare."
          icon={Globe2}
          items={dashboard.breakdowns.countries}
        />
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

function FilterGroup({
  label,
  items,
}: {
  label: string;
  items: Array<{ href: string; label: string; active: boolean }>;
}) {
  return (
    <div className="min-w-0 max-w-full">
      <p className="sr-only md:not-sr-only md:mb-2 md:text-xs md:uppercase md:tracking-[0.18em] md:text-[var(--muted-foreground)]">
        {label}
      </p>
      <div
        className={cn(
          "grid min-w-0 max-w-full overflow-hidden rounded-[1.2rem] bg-[#202023] p-1 md:flex md:flex-wrap md:gap-2 md:bg-transparent md:p-0",
          items.length === 3 ? "grid-cols-3" : "grid-cols-4",
        )}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "min-w-0 truncate rounded-[0.95rem] px-2 py-2 text-center text-xs font-semibold transition md:rounded-full md:border md:px-3 md:py-1.5",
              item.active
                ? "bg-[#2a2a2d] text-white md:border-accent/40 md:bg-accent"
                : "text-[rgba(255,255,255,0.42)] hover:text-white md:border-white/10 md:bg-white/5 md:text-[var(--muted)] md:hover:bg-white/10",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  featured = false,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Activity;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#171719] p-4 md:glass-panel md:rounded-[1.6rem]",
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

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-accent md:inline-flex">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-xl font-semibold text-white md:text-lg">{title}</h2>
        <p className="mt-1 hidden text-sm leading-6 text-[var(--muted)] md:block">
          {description}
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[1.2rem] border border-white/8 bg-black/20 p-3 sm:rounded-[1.4rem] sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.42)]">
        {label}
      </p>
      <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-white">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  icon,
  items,
  compact = false,
}: {
  title: string;
  description: string;
  icon: typeof Activity;
  items: Array<{ label: string; value: number; percentage: number }>;
  compact?: boolean;
}) {
  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden rounded-[1.65rem] border-white/8 bg-transparent shadow-none md:glass-panel md:rounded-[2rem]",
        compact && "xl:col-span-2",
      )}
    >
      <CardContent className="p-0 md:p-6">
        <SectionHeader icon={icon} title={title} description={description} />
        <div className="mt-4 overflow-hidden rounded-[1.4rem] bg-[#171719] md:space-y-3 md:overflow-visible md:rounded-none md:bg-transparent">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.label}
                className="border-b border-white/8 px-4 py-4 last:border-b-0 md:rounded-[1.15rem] md:border md:bg-black/20 md:px-4 md:py-3"
              >
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate text-lg font-semibold text-white md:text-sm md:font-medium">
                    {item.label}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3 text-right">
                    <span className="text-lg font-medium text-[rgba(255,255,255,0.58)] md:text-sm">
                      {formatNumber(item.value)}
                    </span>
                    <span className="min-w-10 text-sm font-semibold text-[rgba(255,255,255,0.42)] md:text-xs">
                      {item.percentage}%
                    </span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-white/8 bg-[#171719] p-4 text-sm text-[var(--muted)]">
              Belum ada data untuk filter ini.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
