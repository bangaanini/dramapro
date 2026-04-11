import { RefreshCcw } from "lucide-react";

import { AdminSyncPanel } from "@/components/admin-sync-panel";
import { Badge } from "@/components/ui/badge";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminSyncPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <RefreshCcw className="mr-2 size-3.5" />
          Sinkronisasi metadata
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Sync Provider
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Jalankan sinkronisasi feed provider secara manual untuk home, new, dan
          popular.
        </p>
      </div>

      <AdminSyncPanel adminName={admin.name} adminEmail={admin.email} />
    </div>
  );
}
