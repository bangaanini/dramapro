import { Crown, Plus } from "lucide-react";

import {
  createVipPricePlanAction,
  toggleVipPricePlanAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminVipPricingPage(
  props: PageProps<"/admin/vip-pricing">,
) {
  const searchParams = await props.searchParams;
  const saved = searchParams.saved === "1";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : null;

  const plans = await prisma.vipPricePlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { priceAmount: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-white/10 p-6">
        <Badge className="border-accent/30 bg-accent-soft text-accent">
          <Crown className="mr-2 size-3.5" />
          Tabel harga VIP
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Paket Harga VIP
        </h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            {saved ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Data paket VIP berhasil diperbarui.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3 font-medium">Paket</th>
                    <th className="px-3 py-3 font-medium">Durasi</th>
                    <th className="px-3 py-3 font-medium">Harga</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.length > 0 ? (
                    plans.map((plan) => (
                      <tr key={plan.id} className="border-b border-white/6 last:border-b-0">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-white">{plan.name}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {plan.slug}
                            {plan.description ? ` • ${plan.description}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-white">{plan.durationDays} hari</td>
                        <td className="px-3 py-4 text-white">
                          {formatPrice(plan.priceAmount, plan.currency)}
                        </td>
                        <td className="px-3 py-4">
                          <Badge variant={plan.isActive ? "default" : "outline"}>
                            {plan.isActive ? "Aktif" : "Draft"}
                          </Badge>
                        </td>
                        <td className="px-3 py-4">
                          <form action={toggleVipPricePlanAction}>
                            <input type="hidden" name="id" value={plan.id} />
                            <input
                              type="hidden"
                              name="nextActive"
                              value={plan.isActive ? "false" : "true"}
                            />
                            <Button type="submit" variant="secondary" size="sm">
                              {plan.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-[var(--muted)]"
                      >
                        Belum ada paket VIP. Tambahkan paket pertama di panel samping.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Tambah paket VIP</h2>
            </div>

            <form action={createVipPricePlanAction} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Nama paket</span>
                <input
                  name="name"
                  type="text"
                  placeholder="VIP 30 Hari"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Slug paket</span>
                <input
                  name="slug"
                  type="text"
                  placeholder="vip-30-hari"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">Durasi</span>
                  <input
                    name="durationDays"
                    type="number"
                    min={1}
                    placeholder="30"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">Harga</span>
                  <input
                    name="priceAmount"
                    type="number"
                    min={1}
                    placeholder="49000"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">Currency</span>
                  <input
                    name="currency"
                    type="text"
                    defaultValue="IDR"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white">Urutan</span>
                  <input
                    name="sortOrder"
                    type="number"
                    min={0}
                    defaultValue={plans.length}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Deskripsi</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Akses semua episode premium selama 30 hari."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked
                  className="size-4 accent-[var(--accent)]"
                />
                <div>
                  <p className="font-medium text-white">Aktifkan paket ini</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Paket aktif akan muncul sebagai pilihan utama atau paket unggulan.
                  </p>
                </div>
              </label>

              <Button type="submit" className="w-full">
                <Plus className="mr-2 size-4" />
                Tambah paket VIP
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
