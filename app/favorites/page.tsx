import { Heart } from "lucide-react";
import { redirect } from "next/navigation";

import { FavoritesGrid } from "@/components/favorites-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/favorites");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SiteHeader current="account" />

      <section className="soft-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <Badge className="border-accent/30 bg-accent-soft text-accent">
            <Heart className="mr-2 size-3.5" />
            Daftar favorit
          </Badge>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Favoritmu
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Semua drama yang kamu tandai tersimpan di sini dan siap dibuka lagi
              kapan saja.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <FavoritesGrid userId={user.id} />
      </section>

      <SiteFooter />
    </main>
  );
}
