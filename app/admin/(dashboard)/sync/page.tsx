import { RefreshCcw } from "lucide-react";

import { AdminSyncPanel } from "@/components/admin-sync-panel";
import { Badge } from "@/components/ui/badge";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCatalogSyncDashboardForPlatform } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function AdminSyncPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return null;
  }

  const dashboard = await getCatalogSyncDashboardForPlatform().catch(() => null);

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-[1.75rem] border border-white/10 p-5">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <RefreshCcw className="mr-2 size-3.5" />
          Sinkronisasi katalog baru
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          Catalog Sync
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Semua provider dari dokumentasi sudah diregistrasikan. Halaman ini
          dipakai untuk pilih platform, refresh tablist, sync tab, dan hydrate
          episode. Bahasa default katalog tetap ID.
        </p>
      </div>

      {dashboard ? (
        <section className="glass-panel rounded-[1.75rem] border border-white/10 p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MiniStat label="Platform" value={dashboard.platform.name} />
            <MiniStat label="Bahasa" value={dashboard.language.code.toUpperCase()} />
            <MiniStat label="Tab" value={formatNumber(dashboard.stats.tabCount)} />
            <MiniStat label="Series" value={formatNumber(dashboard.stats.seriesCount)} />
            <MiniStat label="Episode" value={formatNumber(dashboard.stats.episodeCount)} />
          </div>
        </section>
      ) : null}

      <AdminSyncPanel
        adminName={admin.name}
        adminEmail={admin.email}
        initialDashboard={dashboard}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
