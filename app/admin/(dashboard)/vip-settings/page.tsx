import { LockKeyhole } from "lucide-react";

import { saveVipSettingsAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminVipSettingsPage(
  props: PageProps<"/admin/vip-settings">,
) {
  const searchParams = await props.searchParams;
  const saved = searchParams.saved === "1";
  const settings = await prisma.vipSettings.findUnique({
    where: { id: "global" },
  });

  const isEnabled = settings?.isEnabled ?? false;
  const lockFromEpisode = settings?.lockFromEpisode ?? 0;

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <LockKeyhole className="mr-2 size-3.5" />
          Tabel pengaturan VIP
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Pengaturan Lock Episode
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Atur kapan episode premium mulai terkunci secara global. Setting ini
          disiapkan untuk alur VIP dan payment gateway yang akan ditambahkan
          berikutnya.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3 font-medium">Status VIP lock</th>
                    <th className="px-3 py-3 font-medium">Mulai episode</th>
                    <th className="px-3 py-3 font-medium">Terakhir diubah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/6">
                    <td className="px-3 py-4">
                      <Badge variant={isEnabled ? "default" : "outline"}>
                        {isEnabled ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 text-white">
                      {isEnabled ? `EP.${lockFromEpisode}` : "-"}
                    </td>
                    <td className="px-3 py-4 text-[var(--muted)]">
                      {settings?.updatedAt
                        ? new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(settings.updatedAt)
                        : "Belum pernah"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {saved ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Pengaturan VIP berhasil diperbarui.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Ubah rule VIP</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Jika aktif, semua drama akan dianggap terkunci mulai dari episode
                yang Anda tentukan.
              </p>
            </div>

            <form action={saveVipSettingsAction} className="space-y-4">
              <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
                <input
                  name="isEnabled"
                  type="checkbox"
                  defaultChecked={isEnabled}
                  className="size-4 accent-[var(--accent)]"
                />
                <div>
                  <p className="font-medium text-white">Aktifkan VIP lock</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Nonaktifkan jika semua episode ingin terbuka.
                  </p>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Mulai kunci dari episode
                </span>
                <input
                  name="lockFromEpisode"
                  type="number"
                  min={1}
                  defaultValue={Math.max(lockFromEpisode, 1)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <Button type="submit" className="w-full">
                Simpan pengaturan VIP
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
