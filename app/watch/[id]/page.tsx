import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Clapperboard, Flame, Layers3, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video-player";
import { prisma } from "@/lib/prisma";
import { shouldBypassImageOptimization } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WatchPage(props: PageProps<"/watch/[id]">) {
  const { id } = await props.params;

  const drama = await prisma.drama.findUnique({
    where: { id },
  });

  if (!drama) {
    notFound();
  }

  const relatedFilters =
    drama.tags.length > 0
      ? [
          { providerName: drama.providerName },
          { tags: { hasSome: drama.tags.slice(0, 4) } },
        ]
      : [{ providerName: drama.providerName }];

  const relatedDramas = await prisma.drama.findMany({
    where: {
      id: { not: drama.id },
      OR: relatedFilters,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 6,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-5 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-4 sm:mb-6 sm:px-0">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="mr-2 size-4" />
          Back to catalog
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{drama.providerName}</Badge>
          <Badge variant="outline">{drama.episodeCount} episodes</Badge>
        </div>
      </div>

      <section className="grid gap-6 sm:gap-8 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)] xl:items-start">
        <div className="px-4 sm:px-0 xl:sticky xl:top-6">
          <VideoPlayer
            internalDramaId={drama.id}
            title={drama.title}
            providerName={drama.providerName}
            episodeCount={drama.episodeCount}
            watchValue={drama.watchValue}
          />
        </div>

        <div className="space-y-5 px-4 sm:space-y-6 sm:px-0">
          <Card className="glass-panel overflow-hidden rounded-[2rem] border-white/10">
            <CardContent className="p-0">
              <div className="grid gap-5 p-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-6">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                  {drama.thumbUrl ? (
                    <Image
                      src={drama.thumbUrl}
                      alt={drama.title}
                      fill
                      className="object-cover"
                      sizes="160px"
                      unoptimized={shouldBypassImageOptimization(drama.thumbUrl)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#2e1c18,#1a1110)] text-sm text-[var(--muted-foreground)]">
                      No Cover
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-accent/25 bg-accent-soft text-accent">
                      <Sparkles className="mr-1.5 size-3.5" />
                      Streaming fresh
                    </Badge>
                    <Badge variant="secondary">{drama.providerName}</Badge>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {drama.title}
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                      {drama.description || "Sinopsis belum tersedia untuk drama ini."}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-black/18 p-4 text-sm sm:grid-cols-3">
                    <div className="flex items-center gap-3 text-white">
                      <Clapperboard className="size-4 text-accent" />
                      <span>{drama.episodeCount} episode</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                      <Layers3 className="size-4 text-accent" />
                      <span>{drama.watchValue || "Fresh sync"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                      <Flame className="size-4 text-accent" />
                      <span>{drama.isNewBook ? "New release" : "Catalog title"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            id="watch-synopsis"
            className="glass-panel rounded-[2rem] border-white/10"
          >
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Synopsis
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Cerita singkat
                </h2>
              </div>
              <p className="text-sm leading-8 text-[var(--muted)] sm:text-base">
                {drama.description ||
                  "Metadata lokal belum punya deskripsi panjang untuk judul ini."}
              </p>
            </CardContent>
          </Card>

          {drama.tags.length > 0 ? (
            <Card className="glass-panel rounded-[2rem] border-white/10">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                    Genre populer
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Tag cerita</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {drama.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="border-white/10 bg-white/6 px-4 py-2 text-sm text-white"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {relatedDramas.length > 0 ? (
            <Card className="glass-panel rounded-[2rem] border-white/10">
              <CardContent className="space-y-5 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                    Drama serupa
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Lanjut nonton berikutnya
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {relatedDramas.map((relatedDrama) => (
                    <Link
                      key={relatedDrama.id}
                      href={`/watch/${relatedDrama.id}`}
                      className="group"
                    >
                      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 transition duration-300 hover:-translate-y-1 hover:border-accent/35">
                        <div className="relative aspect-[3/4] overflow-hidden bg-black/30">
                          {relatedDrama.thumbUrl ? (
                            <Image
                              src={relatedDrama.thumbUrl}
                              alt={relatedDrama.title}
                              fill
                              className="object-cover transition duration-500 group-hover:scale-[1.04]"
                              sizes="(max-width: 640px) 45vw, 200px"
                              unoptimized={shouldBypassImageOptimization(
                                relatedDrama.thumbUrl,
                              )}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                              No Cover
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="line-clamp-2 text-sm font-semibold text-white">
                            {relatedDrama.title}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {relatedDrama.episodeCount > 0
                              ? `${relatedDrama.episodeCount} episodes`
                              : "Episode info unavailable"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
