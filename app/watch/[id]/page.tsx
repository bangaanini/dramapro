import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clapperboard,
  Layers3,
  Share2,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";

import { DramaDetailShareButton } from "@/components/drama-detail-share-button";
import { EpisodeGridLink } from "@/components/episode-grid-link";
import { FavoriteDramaButton } from "@/components/favorite-drama-button";
import { PlayDramaButton } from "@/components/play-drama-button";
import { SiteFooter } from "@/components/site-footer";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_OG_IMAGE,
  absoluteResolvedUrl,
  toSeoDescription,
} from "@/lib/site";
import {
  buildDramaShareStartParam,
  buildTelegramMiniAppStartAppLink,
} from "@/lib/telegram-bot";
import { getCurrentUser, userHasAdminVideoBypass } from "@/lib/user-auth";
import {
  normalizeDisplayImageUrl,
  shouldBypassImageOptimization,
} from "@/lib/utils";
import {
  clampEpisodeForVipAccess,
  getVipLockStartEpisode,
  isEpisodeVipLocked,
  isVipActive,
} from "@/lib/vip";
import { ACTIVE_PROVIDERS } from "@/lib/provider-adapter";

export const dynamic = "force-dynamic";

const getDramaById = cache(async (id: string) =>
  prisma.drama.findFirst({
    where: {
      id,
      isStreamPlayable: true,
      providerName: {
        in: ACTIVE_PROVIDERS,
      },
    },
  }),
);

export async function generateMetadata(
  props: PageProps<"/watch/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const [drama, settings] = await Promise.all([getDramaById(id), getAppSettings()]);

  if (!drama) {
    return {
      title: "Drama tidak ditemukan",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = toSeoDescription(
    drama.description,
    `${drama.title} dari ${drama.providerName} dengan ${drama.episodeCount} episode di ${settings.site.name}.`,
  );
  const image = normalizeDisplayImageUrl(drama.thumbUrl) || DEFAULT_OG_IMAGE;

  return {
    title: drama.title,
    description,
    keywords: [drama.title, drama.providerName, ...drama.tags].slice(0, 12),
    alternates: {
      canonical: `/watch/${drama.id}`,
    },
    openGraph: {
      type: "website",
      title: drama.title,
      description,
      url: `/watch/${drama.id}`,
      images: [
        {
          url: image,
          alt: drama.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: drama.title,
      description,
      images: [image],
    },
  };
}

export default async function WatchDetailPage(props: PageProps<"/watch/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();

  const [drama, watchHistory, favorite, vipSettings, settings, hasAdminBypass] =
    await Promise.all([
      getDramaById(id),
      user
        ? prisma.watchHistory.findUnique({
            where: {
              userId_dramaId: {
                userId: user.id,
                dramaId: id,
              },
            },
            select: {
              episodeIndex: true,
              lastPositionSeconds: true,
            },
          })
        : Promise.resolve(null),
      user
        ? prisma.favoriteDrama.findUnique({
            where: {
              userId_dramaId: {
                userId: user.id,
                dramaId: id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.vipSettings.findUnique({
        where: { id: "global" },
        select: {
          isEnabled: true,
          lockFromEpisode: true,
        },
      }),
      getAppSettings(),
      userHasAdminVideoBypass(user),
    ]);

  if (!drama) {
    notFound();
  }

  const dramaThumbUrl = normalizeDisplayImageUrl(drama.thumbUrl);
  const detailDescription = toSeoDescription(
    drama.description,
    `${drama.title} dari ${drama.providerName} dengan ${drama.episodeCount} episode di ${settings.site.name}.`,
  );
  const vipLockFromEpisode = hasAdminBypass || isVipActive(user?.vipExpiresAt)
    ? null
    : getVipLockStartEpisode(vipSettings);
  const preferredInitialEpisode = clampEpisodeForVipAccess(
    watchHistory?.episodeIndex ?? 1,
    drama.episodeCount,
    vipLockFromEpisode,
  );
  const watchHistoryIsLocked = Boolean(
    watchHistory &&
      vipLockFromEpisode &&
      watchHistory.episodeIndex >= vipLockFromEpisode,
  );

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
      isStreamPlayable: true,
      providerName: {
        in: ACTIVE_PROVIDERS,
      },
      OR: relatedFilters,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 6,
  });

  const playHref = `/watch/${drama.id}/play?episode=${preferredInitialEpisode}`;
  const shareUrl = await absoluteResolvedUrl(`/watch/${drama.id}`);
  const telegramShareUrl =
    user?.authProvider === "telegram"
      ? await buildTelegramMiniAppStartAppLink(
          buildDramaShareStartParam({
            dramaId: drama.id,
            referralCode: user.affiliateCode ?? null,
          }),
        )
      : null;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: await absoluteResolvedUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: drama.title,
            item: await absoluteResolvedUrl(`/watch/${drama.id}`),
          },
        ],
      },
      {
        "@type": "TVSeries",
        name: drama.title,
        description: detailDescription,
        image: await absoluteResolvedUrl(dramaThumbUrl || DEFAULT_OG_IMAGE),
        url: await absoluteResolvedUrl(`/watch/${drama.id}`),
        inLanguage: "id-ID",
        numberOfEpisodes: drama.episodeCount > 0 ? drama.episodeCount : undefined,
        genre: drama.tags.length > 0 ? drama.tags : undefined,
      },
    ],
  };

  return (
    <main className="route-transition-shell mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <Card className="glass-panel overflow-hidden rounded-[2.2rem] border-white/10">
          <CardContent className="p-0">
            <div className="relative aspect-[9/14] overflow-hidden bg-black sm:aspect-[9/12]">
              {dramaThumbUrl ? (
                <Image
                  src={dramaThumbUrl}
                  alt={drama.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  unoptimized={shouldBypassImageOptimization(dramaThumbUrl)}
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.03)_18%,rgba(8,8,8,0.12)_58%,rgba(8,8,8,0.68)_100%)]" />

              <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 pb-4 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-accent/25 bg-accent-soft text-accent">
                    <Sparkles className="mr-1.5 size-3.5" />
                    Detail drama
                  </Badge>
                  <Badge variant="secondary">{settings.site.name}</Badge>
                </div>

                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)] sm:text-4xl">
                  {drama.title}
                </h1>

                <p className="text-sm text-white/78">
                  {drama.episodeCount} episode
                  {drama.watchValue ? ` · ${drama.watchValue}` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-5 border-t border-white/8 bg-[linear-gradient(180deg,rgba(23,16,16,0.98),rgba(12,9,9,0.98))] p-4 sm:p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:gap-3">
                <PlayDramaButton
                  href={playHref}
                  label={
                    watchHistory && !watchHistoryIsLocked
                      ? `Lanjutkan EP.${preferredInitialEpisode}`
                      : "Mulai Nonton"
                  }
                  className={cn("h-12 min-w-0 rounded-full px-4 sm:px-6")}
                />
                <DramaDetailShareButton
                  title={drama.title}
                  shareUrl={shareUrl}
                  telegramShareUrl={telegramShareUrl}
                  compact
                />
                <FavoriteDramaButton
                  dramaId={drama.id}
                  redirectTo={`/watch/${drama.id}`}
                  isFavorite={Boolean(favorite)}
                  size="lg"
                  compact
                  className="h-12 min-w-12 rounded-full px-0 sm:px-5"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Sinopsis
                </p>
                <p className="text-sm leading-7 text-white/78 sm:text-base">
                  {drama.description || "Sinopsis belum tersedia untuk drama ini."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="glass-panel rounded-[2rem] border-white/10">
            <CardContent className="space-y-4 p-6">
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
                    <Share2 className="size-4 text-accent" />
                    <span>Bagikan ke Telegram</span>
                  </div>
                </div>

              {vipLockFromEpisode ? (
                <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Upgrade ke VIP untk membuka semua episode.
                </div>
              ) : null}

              {watchHistory ? (
                <div className="rounded-[1.4rem] border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-white/90">
                  {watchHistoryIsLocked ? (
                    <>
                      Riwayat terakhir ada di EP.{watchHistory.episodeIndex}, tetapi episode
                      itu sekarang terkunci. Tombol tonton akan memulai dari EP.
                      {preferredInitialEpisode}.
                    </>
                  ) : (
                    <>
                      Lanjutkan menonton di EP.{preferredInitialEpisode} pada{" "}
                      {Math.max(0, watchHistory.lastPositionSeconds)} detik.
                    </>
                  )}
                </div>
              ) : null}

              {drama.tags.length > 0 ? (
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
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-panel rounded-[2rem] border-white/10">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                    Episode
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Pilih episode
                  </h2>
                </div>
                <Badge variant="secondary">{drama.episodeCount} total</Badge>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {Array.from({ length: drama.episodeCount }, (_, index) => index + 1).map(
                  (episode) => {
                    const isLocked = isEpisodeVipLocked(episode, vipLockFromEpisode);
                    const isResume = preferredInitialEpisode === episode;

                    if (isLocked) {
                      return (
                        <EpisodeGridLink
                          key={episode}
                          episode={episode}
                          locked
                          href={`/vip?next=${encodeURIComponent(
                            `/watch/${drama.id}/play?episode=${episode}`,
                          )}`}
                        />
                      );
                    }

                    return (
                      <EpisodeGridLink
                        key={episode}
                        episode={episode}
                        isResume={isResume}
                        href={`/watch/${drama.id}/play?episode=${episode}`}
                      />
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {relatedDramas.length > 0 ? (
        <section className="mt-8">
          <Card className="glass-panel rounded-[2rem] border-white/10">
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Drama serupa
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Lanjut lihat judul berikutnya
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {relatedDramas.map((relatedDrama) => (
                  <Link key={relatedDrama.id} href={`/watch/${relatedDrama.id}`} className="group">
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 transition duration-300 hover:-translate-y-1 hover:border-accent/35">
                      <div className="relative aspect-[3/4] overflow-hidden bg-black/30">
                        {normalizeDisplayImageUrl(relatedDrama.thumbUrl) ? (
                          <Image
                            src={normalizeDisplayImageUrl(relatedDrama.thumbUrl)}
                            alt={relatedDrama.title}
                            fill
                            className="object-cover transition duration-500 group-hover:scale-[1.04]"
                            sizes="(max-width: 640px) 45vw, 200px"
                            unoptimized={shouldBypassImageOptimization(
                              normalizeDisplayImageUrl(relatedDrama.thumbUrl),
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
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
