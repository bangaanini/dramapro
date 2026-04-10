import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Clock3, Heart, LibraryBig } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserSessionNav } from "@/components/user-session-nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { shouldBypassImageOptimization } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/library");
  }

  const [favorites, historyEntries] = await Promise.all([
    prisma.favoriteDrama.findMany({
      where: { userId: user.id },
      include: { drama: true },
      orderBy: { createdAt: "desc" },
      take: 18,
    }),
    prisma.watchHistory.findMany({
      where: { userId: user.id },
      include: { drama: true },
      orderBy: { updatedAt: "desc" },
      take: 18,
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="mr-2 size-4" />
          Kembali ke katalog
        </Link>
        <UserSessionNav />
      </div>

      <section className="glass-panel rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Badge className="border-accent/30 bg-accent-soft text-accent">
              <LibraryBig className="mr-2 size-3.5" />
              Personal library
            </Badge>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Halo, {user.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Akunmu sekarang siap menyimpan drama favorit dan jadi rumah untuk
                history nonton berikutnya.
              </p>
            </div>
          </div>
          <div className="grid gap-3 rounded-3xl border border-white/8 bg-black/20 p-4 text-sm text-[var(--muted)] backdrop-blur">
            <div className="flex items-center gap-2 text-white">
              <Heart className="size-4 text-accent" />
              <span>{favorites.length} favorit tersimpan</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Clock3 className="size-4 text-accent" />
              <span>{historyEntries.length} riwayat terbaca</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel rounded-[1.9rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                Favorites
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Drama favoritmu
              </h2>
            </div>

            {favorites.length === 0 ? (
              <div className="rounded-[1.4rem] border border-white/10 bg-black/18 p-5 text-sm leading-7 text-[var(--muted)]">
                Belum ada drama favorit. Buka halaman watch lalu tekan tombol
                favorit untuk menyimpannya ke library.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {favorites.map(({ id, drama }) => (
                  <Link key={id} href={`/watch/${drama.id}`} className="group">
                    <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/5 transition duration-300 hover:-translate-y-1 hover:border-accent/35">
                      <div className="relative aspect-[3/4] overflow-hidden bg-black/30">
                        {drama.thumbUrl ? (
                          <Image
                            src={drama.thumbUrl}
                            alt={drama.title}
                            fill
                            className="object-cover transition duration-500 group-hover:scale-[1.04]"
                            sizes="(max-width: 640px) 45vw, 200px"
                            unoptimized={shouldBypassImageOptimization(drama.thumbUrl)}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                            No Cover
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-white">
                          {drama.title}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {drama.episodeCount > 0
                            ? `${drama.episodeCount} episode`
                            : "Episode belum terbaca"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-[1.9rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                Watch history
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Riwayat tontonan
              </h2>
            </div>

            {historyEntries.length === 0 ? (
              <div className="rounded-[1.4rem] border border-white/10 bg-black/18 p-5 text-sm leading-7 text-[var(--muted)]">
                Riwayat masih kosong. Struktur databasenya sudah siap, jadi langkah
                berikutnya kita tinggal menyambungkan progress player ke akun user.
              </div>
            ) : (
              <div className="space-y-3">
                {historyEntries.map(({ id, drama, episodeIndex, updatedAt }) => (
                  <Link
                    key={id}
                    href={`/watch/${drama.id}`}
                    className="block rounded-[1.4rem] border border-white/10 bg-white/5 p-4 transition hover:border-accent/35 hover:bg-white/7"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{drama.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Episode terakhir: EP.{episodeIndex}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(updatedAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
