import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Clapperboard, Layers3 } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video-player";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WatchPage(props: PageProps<"/watch/[id]">) {
  const { id } = await props.params;

  const drama = await prisma.drama.findUnique({
    where: { id },
  });

  if (!drama) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="mr-2 size-4" />
          Back to catalog
        </Link>
        <Badge variant="secondary">{drama.providerName}</Badge>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="glass-panel rounded-[2rem] p-4 sm:p-6">
          <VideoPlayer
            internalDramaId={drama.id}
            title={drama.title}
            episodeCount={drama.episodeCount}
          />
        </div>

        <aside className="space-y-6">
          <Card className="glass-panel overflow-hidden rounded-[2rem]">
            <div className="relative aspect-[3/4] bg-white/5">
              {drama.thumbUrl ? (
                <Image
                  src={drama.thumbUrl}
                  alt={drama.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 360px"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#2e1c18,#1a1110)] text-sm text-[var(--muted-foreground)]">
                  No Cover
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            </div>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  {drama.title}
                </h1>
                <p className="text-sm leading-7 text-[var(--muted)]">
                  {drama.description || "No description available yet."}
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/8 bg-black/15 p-4 text-sm">
                <div className="flex items-center gap-3 text-white">
                  <Clapperboard className="size-4 text-accent" />
                  <span>{drama.episodeCount} episodes</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <Layers3 className="size-4 text-accent" />
                  <span>{drama.watchValue || "New title"}</span>
                </div>
              </div>

              {drama.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {drama.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}
