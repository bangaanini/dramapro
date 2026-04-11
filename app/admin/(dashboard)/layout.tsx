import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { logoutAdminAction } from "@/app/admin/actions";
import { AdminSidebar } from "@/components/admin-sidebar";
import { buttonVariants } from "@/components/ui/button";
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="mr-2 size-4" />
          Back to catalog
        </Link>

        <form action={logoutAdminAction}>
          <button className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <LogOut className="mr-2 size-4" />
            Logout
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <AdminSidebar
            adminName={admin.name}
            adminEmail={admin.email}
            pendingAffiliateWithdrawals={pendingAffiliateWithdrawals}
          />
        </div>

        <section className="space-y-6">{children}</section>
      </div>
    </main>
  );
}
