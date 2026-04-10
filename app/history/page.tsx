import Link from "next/link";
import { History } from "lucide-react";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/history");
  }

  const historyEntries = await prisma.watchHistory.findMany({
    where: { userId: user.id },
    include: { drama: true },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });

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
        {historyEntries.length === 0 ? (
          <Card className="glass-panel rounded-[1.8rem]">
            <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                <History className="size-7 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  Belum ada riwayat tontonan
                </h2>
                <p className="max-w-md text-sm text-[var(--muted)]">
                  Setelah kamu menonton beberapa detik, player akan otomatis
                  menyimpan progres di halaman ini.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {historyEntries.map(
              ({ id, drama, episodeIndex, lastPositionSeconds, updatedAt }) => (
                <Link
                  key={id}
                  href={`/watch/${drama.id}`}
                  className="block"
                >
                  <Card className="glass-panel rounded-[1.8rem] border-white/10 transition hover:border-accent/35">
                    <CardContent className="flex items-start justify-between gap-4 p-5">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-white">{drama.title}</p>
                        <p className="text-sm text-[var(--muted)]">
                          EP.{episodeIndex} • {Math.max(0, lastPositionSeconds)} detik
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{drama.providerName}</Badge>
                          {drama.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              className="border-white/10 bg-white/6 text-white"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="shrink-0 text-xs text-[var(--muted-foreground)]">
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(updatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ),
            )}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
