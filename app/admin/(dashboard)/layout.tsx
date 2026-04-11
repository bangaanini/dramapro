import { ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin-sidebar";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: LayoutProps<"/admin">) {
  const [admin, pendingAffiliateWithdrawals] = await Promise.all([
    getCurrentAdmin(),
    prisma.affiliateWithdrawal.count({
      where: {
        status: "pending",
      },
    }),
  ]);

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative mb-6 overflow-hidden rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(43,29,24,0.96),rgba(18,13,12,0.96))] px-5 py-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,140,92,0.18),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,204,120,0.12),transparent_28%)]" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <Sparkles className="size-4 text-accent" />
                <span className="text-xs uppercase tracking-[0.18em]">
                  Pending review
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">
                {pendingAffiliateWithdrawals}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                withdrawal affiliate menunggu tindakan
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <ShieldCheck className="size-4 text-accent" />
                <span className="text-xs uppercase tracking-[0.18em]">
                  Admin aktif
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-white">
                {admin.name}
              </p>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">
                {admin.email}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <AdminSidebar
            adminName={admin.name}
            adminEmail={admin.email}
            pendingAffiliateWithdrawals={pendingAffiliateWithdrawals}
          />
        </div>

        <section className="min-w-0 space-y-6">{children}</section>
      </div>
    </main>
  );
}
