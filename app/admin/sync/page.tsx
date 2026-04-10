import Link from "next/link";
import { ChevronLeft, LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { logoutAdminAction } from "@/app/admin/actions";
import { AdminSyncPanel } from "@/components/admin-sync-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminSyncPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ChevronLeft className="mr-2 size-4" />
            Back to catalog
          </Link>
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <ShieldCheck className="mr-2 size-3.5" />
            {admin.email}
          </Badge>
        </div>

        <form action={logoutAdminAction}>
          <button className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <LogOut className="mr-2 size-4" />
            Logout
          </button>
        </form>
      </div>

      <AdminSyncPanel adminName={admin.name} adminEmail={admin.email} />
    </main>
  );
}
