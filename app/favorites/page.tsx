import { Heart } from "lucide-react";
import { redirect } from "next/navigation";

import { toggleFavoriteDramaAction } from "@/app/drama/actions";
import { DramaCard } from "@/components/drama-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/favorites");
  }

  const favorites = await prisma.favoriteDrama.findMany({
    where: { userId: user.id },
    include: { drama: true },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

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
        {favorites.length === 0 ? (
          <Card className="glass-panel rounded-[1.8rem]">
            <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                <Heart className="size-7 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  Belum ada drama favorit
                </h2>
                <p className="max-w-md text-sm text-[var(--muted)]">
                  Tekan tombol favorit di halaman watch untuk menyimpan judul ke
                  daftar ini.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {favorites.map(({ id, drama, createdAt }) => (
              <div key={id} className="space-y-3">
                <DramaCard
                  href={`/watch/${drama.id}`}
                  title={drama.title}
                  thumbUrl={drama.thumbUrl}
                  providerName={drama.providerName}
                  episodeCount={drama.episodeCount}
                  extraMeta={`Disimpan ${new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                  }).format(createdAt)}`}
                />
                <form action={toggleFavoriteDramaAction}>
                  <input type="hidden" name="dramaId" value={drama.id} />
                  <input type="hidden" name="redirectTo" value="/favorites" />
                  <Button type="submit" variant="ghost" size="sm" className="w-full">
                    Hapus dari favorit
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
