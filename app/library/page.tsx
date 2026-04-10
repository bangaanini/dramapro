import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Clock3, Heart, LibraryBig } from "lucide-react";
import { redirect } from "next/navigation";

import { changePasswordUserAction } from "@/app/auth/actions";
import { toggleFavoriteDramaAction } from "@/app/drama/actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { shouldBypassImageOptimization } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LibraryPage(props: PageProps<"/library">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/library");
  }

  const searchParams = await props.searchParams;
  const passwordError =
    typeof searchParams.passwordError === "string"
      ? searchParams.passwordError
      : null;
  const passwordSuccess =
    typeof searchParams.passwordSuccess === "string"
      ? searchParams.passwordSuccess
      : null;

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
      <SiteHeader current="library" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="mr-2 size-4" />
          Kembali ke katalog
        </Link>
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
                Halaman akunmu sekarang menampung favorit, riwayat tontonan, dan
                pengaturan password dalam satu tempat.
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
                {favorites.map(({ id, drama, createdAt }) => (
                  <div
                    key={id}
                    className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/5 transition duration-300 hover:border-accent/35"
                  >
                    <Link href={`/watch/${drama.id}`} className="group block">
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
                    </Link>
                    <div className="space-y-3 p-3">
                      <Link href={`/watch/${drama.id}`} className="block">
                        <p className="line-clamp-2 text-sm font-semibold text-white">
                          {drama.title}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {drama.episodeCount > 0
                            ? `${drama.episodeCount} episode`
                            : "Episode belum terbaca"}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                          Disimpan{" "}
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                          }).format(createdAt)}
                        </p>
                      </Link>
                      <form action={toggleFavoriteDramaAction}>
                        <input type="hidden" name="dramaId" value={drama.id} />
                        <input type="hidden" name="redirectTo" value="/library" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                        >
                          Hapus dari favorit
                        </Button>
                      </form>
                    </div>
                  </div>
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
                Riwayat masih kosong. Setelah user menonton beberapa detik, player
                akan otomatis menyimpan episode terakhir dan posisi tontonan.
              </div>
            ) : (
              <div className="space-y-3">
                {historyEntries.map(
                  ({
                    id,
                    drama,
                    episodeIndex,
                    lastPositionSeconds,
                    updatedAt,
                  }) => (
                  <Link
                    key={id}
                    href={`/watch/${drama.id}`}
                    className="block rounded-[1.4rem] border border-white/10 bg-white/5 p-4 transition hover:border-accent/35 hover:bg-white/7"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{drama.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Episode terakhir: EP.{episodeIndex} •{" "}
                          {Math.max(0, lastPositionSeconds)} detik
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Ketuk untuk lanjut menonton
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
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="glass-panel rounded-[1.9rem] border-white/10">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                Account security
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Ganti password
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Perbarui password akun kapan saja tanpa keluar dari halaman user.
              </p>
            </div>

            <form action={changePasswordUserAction} className="grid gap-4 lg:grid-cols-3">
              <input type="hidden" name="redirectTo" value="/library" />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Password saat ini
                </span>
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">Password baru</span>
                <input
                  name="nextPassword"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white">
                  Konfirmasi password baru
                </span>
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-accent/60 focus:ring-2 focus:ring-[var(--ring)]"
                />
              </label>

              {passwordError ? (
                <div className="lg:col-span-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {passwordError}
                </div>
              ) : null}

              {passwordSuccess ? (
                <div className="lg:col-span-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {passwordSuccess}
                </div>
              ) : null}

              <div className="lg:col-span-3 flex justify-end">
                <Button type="submit">Simpan password baru</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
