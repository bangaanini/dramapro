import { History } from "lucide-react";
import { redirect } from "next/navigation";

import { HistoryList } from "@/components/history-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/history");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <section className="soft-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <History className="mr-2 size-3.5" />
            Riwayat tontonan
          </Badge>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Riwayat
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Drama yang terakhir kamu tonton akan muncul di sini bersama episode
              dan progres terakhir.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <HistoryList userId={user.id} />
      </section>

      <SiteFooter />
    </main>
  );
}
