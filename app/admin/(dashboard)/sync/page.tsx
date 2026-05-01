import { RefreshCcw } from "lucide-react";

import { AdminProviderSyncPanel } from "@/components/admin-provider-sync-panel";
import { Badge } from "@/components/ui/badge";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getProviderSyncDashboard } from "@/lib/provider-sync";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function AdminSyncPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return null;
  }

  const dashboard = await getProviderSyncDashboard().catch(() => null);

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
          Pilih provider StreamAPI, endpoint katalog, page, dan parameter sesuai
          dokumentasi. Worker akan menulis hasilnya ke tabel Catalog lama agar
          integrasi user, VIP, Telegram, favorite, dan history tetap aman.
        </p>
      </div>

      {dashboard ? (
        <section className="glass-panel rounded-[1.75rem] border border-white/10 p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MiniStat label="Provider" value={formatNumber(dashboard.providers.length)} />
            <MiniStat
              label="Drama"
              value={formatNumber(dashboard.providers.reduce((sum, item) => sum + item.dramaCount, 0))}
            />
            <MiniStat
              label="Episode"
              value={formatNumber(dashboard.providers.reduce((sum, item) => sum + item.episodeCount, 0))}
            />
            <MiniStat label="Job" value={formatNumber(dashboard.jobs.length)} />
            <MiniStat label="Log" value={formatNumber(dashboard.logs.length)} />
          </div>
        </section>
      ) : null}

      {dashboard ? <AdminProviderSyncPanel initialDashboard={dashboard} /> : null}
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
