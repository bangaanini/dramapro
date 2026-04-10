import Image from "next/image";
import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { Drama, DramaFeed } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SyncSource } from "@/lib/provider-adapter";
import { shouldBypassImageOptimization } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEFAULT_SECTION_LIMIT = 12;
const MAX_SECTION_LIMIT = 60;
function parseLimit(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(normalized ?? "", 10);

  if (!Number.isInteger(parsed) || parsed < DEFAULT_SECTION_LIMIT) {
    return DEFAULT_SECTION_LIMIT;
  }

  return Math.min(parsed, MAX_SECTION_LIMIT);
}

function buildLoadMoreHref(
  params: Record<string, string | string[] | undefined>,
  key: SyncSource,
  nextLimit: number,
) {
  const search = new URLSearchParams();

  for (const [paramKey, value] of Object.entries(params)) {
    if (paramKey === key) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        search.append(paramKey, entry);
      }
    } else if (typeof value === "string") {
      search.set(paramKey, value);
    }
  }

  search.set(key, String(nextLimit));

  const query = search.toString();
  return query ? `/?${query}` : "/";
}

type FeedEntryWithDrama = DramaFeed & { drama: Drama };

function DramaFeedSection({
  title,
  description,
  entries,
  total,
  source,
  currentLimit,
  searchParams,
}: {
  title: string;
  description: string;
  entries: FeedEntryWithDrama[];
  total: number;
  source: SyncSource;
  currentLimit: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const hasMore = total > currentLimit;
  const nextLimit = Math.min(currentLimit + DEFAULT_SECTION_LIMIT, MAX_SECTION_LIMIT);

  return (
    <section className="mt-10 flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
        <Badge variant="secondary">{total} titles</Badge>
      </div>

      {entries.length === 0 ? (
        <Card className="glass-panel rounded-[1.75rem]">
          <CardContent className="flex min-h-40 items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
            Feed ini masih kosong. Jalankan sync source <span className="mx-1 font-medium text-white">{source}</span>
            dari panel admin.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {entries.map(({ drama }) => (
              <Link key={`${source}-${drama.id}`} href={`/watch/${drama.id}`} className="group">
                <Card className="glass-panel h-full overflow-hidden rounded-[1.6rem] border-white/8 transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]">
                  <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
                    {drama.thumbUrl ? (
                      <Image
                        src={drama.thumbUrl}
                        alt={drama.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.05]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                        unoptimized={shouldBypassImageOptimization(drama.thumbUrl)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#2e1c18,#1a1110)] text-sm text-[var(--muted-foreground)]">
                        No Cover
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute left-3 top-3">
                      <Badge className="border-white/10 bg-black/45 text-white backdrop-blur">
                        {drama.providerName}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-2">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-white">
                        {drama.title}
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {drama.episodeCount > 0
                          ? `${drama.episodeCount} episodes`
                          : "Episode info unavailable"}
                      </p>
                    </div>
                    <div className={buttonVariants({ variant: "secondary", size: "sm" })}>
                      Watch now
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <Link
                href={buildLoadMoreHref(searchParams, source, nextLimit)}
                className={buttonVariants({ variant: "secondary", size: "default" })}
              >
                Load more {title.toLowerCase()}
              </Link>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const homeLimit = parseLimit(searchParams.home);
  const newLimit = parseLimit(searchParams.new);
  const popularLimit = parseLimit(searchParams.popular);

  const [totalDramas, homeEntries, homeTotal, newEntries, newTotal, popularEntries, popularTotal] =
    await Promise.all([
      prisma.drama.count(),
      prisma.dramaFeed.findMany({
        where: { source: "home" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: homeLimit,
      }),
      prisma.dramaFeed.count({ where: { source: "home" } }),
      prisma.dramaFeed.findMany({
        where: { source: "new" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: newLimit,
      }),
      prisma.dramaFeed.count({ where: { source: "new" } }),
      prisma.dramaFeed.findMany({
        where: { source: "popular" },
        include: { drama: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: popularLimit,
      }),
      prisma.dramaFeed.count({ where: { source: "popular" } }),
    ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <section className="glass-panel relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,69,0.18),transparent_28%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <Badge className="border-accent/40 bg-accent-soft text-accent">
              <Sparkles className="mr-2 size-3.5" />
              Metadata-first streaming gateway
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Short dramas, synced locally, streamed fresh on demand.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                DramaPro keeps provider metadata in Postgres and fetches signed
                playback URLs just in time, so the catalog stays fast without
                shipping stale streams.
              </p>
            </div>
          </div>
          <div className="grid gap-3 rounded-3xl border border-white/8 bg-black/20 p-4 text-sm text-[var(--muted)] shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 text-white">
              <Flame className="size-4 text-accent" />
              <span className="font-medium">{totalDramas} dramas ready</span>
            </div>
            <p>8 providers normalized behind one adapter.</p>
            <p>Playback URLs are never persisted.</p>
          </div>
        </div>
      </section>

      {totalDramas === 0 ? (
        <section className="mt-8">
          <Card className="glass-panel rounded-[1.75rem]">
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4">
                <Sparkles className="size-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  Your library is empty
                </h3>
                <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
                  Jalankan sync feed home, new, atau popular dari panel admin
                  untuk mengisi section beranda.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <>
          <DramaFeedSection
            title="Home Picks"
            description="Koleksi utama lintas provider untuk beranda."
            entries={homeEntries}
            total={homeTotal}
            source="home"
            currentLimit={homeLimit}
            searchParams={searchParams}
          />
          <DramaFeedSection
            title="New Releases"
            description="Drama terbaru yang masuk ke upstream feed."
            entries={newEntries}
            total={newTotal}
            source="new"
            currentLimit={newLimit}
            searchParams={searchParams}
          />
          <DramaFeedSection
            title="Popular Now"
            description="Judul yang sedang ramai saat provider mendukung feed ini."
            entries={popularEntries}
            total={popularTotal}
            source="popular"
            currentLimit={popularLimit}
            searchParams={searchParams}
          />
        </>
      )}
    </main>
  );
}
