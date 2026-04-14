import { Download } from "lucide-react";

import { AdminPromoDownloader } from "@/components/admin-promo-downloader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AdminPromoDownloaderPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Download className="mr-2 size-3.5" />
          Download promo
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Promo Episode Downloader
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Cari drama dari database lokal, pilih episode tertentu, lalu ambil
          source promo untuk kebutuhan konten. V1 akan mengunduh langsung ke
          device admin jika tersedia MP4, dan memakai fallback link jika source
          hanya HLS.
        </p>
      </div>

      <Card className="glass-panel rounded-[2rem] border-white/10">
        <CardContent className="p-6">
          <AdminPromoDownloader />
        </CardContent>
      </Card>
    </div>
  );
}
