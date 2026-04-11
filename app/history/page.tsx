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
    <main className="mx-auto min-h-screen w-full max-w-none px-0 py-0">
      <SiteHeader current="account" />

      <div className="mx-auto w-full max-w-7xl px-3 pb-2 sm:px-4 lg:px-6">
        <section className="mt-4 soft-panel rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8">
          <div className="space-y-3">
            <Badge className="border-accent/30 bg-accent-soft text-accent">
              <History className="mr-2 size-3.5" />
              Riwayat tontonan
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Riwayat
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Drama yang terakhir kamu tonton akan muncul di sini bersama episode
                dan progres terakhir.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <HistoryList userId={user.id} />
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
