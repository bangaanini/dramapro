
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
