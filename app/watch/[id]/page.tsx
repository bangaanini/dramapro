import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Layers3, Sparkles } from "lucide-react";

import { DramaDetailShareButton } from "@/components/drama-detail-share-button";
import { DramaDetailAdminDownloadPanel } from "@/components/drama-detail-admin-download-panel";
import { EpisodeGridLink } from "@/components/episode-grid-link";
import { FavoriteDramaButton } from "@/components/favorite-drama-button";
import { PlayDramaButton } from "@/components/play-drama-button";
import { DramaCard } from "@/components/drama-card";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import { ensureSeriesHydrated, ensureSeriesPlayableFresh } from "@/lib/catalog";
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

export const dynamic = "force-dynamic";

const getSeriesById = cache(async (id: string) => ensureSeriesHydrated(id));

export async function generateMetadata(
  props: PageProps<"/watch/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const [series, settings] = await Promise.all([getSeriesById(id), getAppSettings()]);

  if (!series) {
    return {
      title: "Drama tidak ditemukan",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = toSeoDescription(
    series.description,
    `${series.title} dengan ${series.chapterCount} episode di ${settings.site.name}.`,
  );
  const image = normalizeDisplayImageUrl(series.coverUrl) || DEFAULT_OG_IMAGE;

  return {
    title: series.title,
    description,
    keywords: [series.title, series.platformId, ...series.tags].slice(0, 12),
    alternates: {
      canonical: `/watch/${series.id}`,
    },
    openGraph: {
      type: "website",
      title: series.title,
      description,
      url: `/watch/${series.id}`,
      images: [
        {
          url: image,
          alt: series.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: series.title,
      description,
      images: [image],
    },
  };
}

export default async function WatchDetailPage(props: PageProps<"/watch/[id]">) {
  const { id } = await props.params;
  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);

  const [series, watchHistory, favorite, vipSettings, settings, hasAdminUserBypass] =
    await Promise.all([
      ensureSeriesPlayableFresh(id, {
        hideOnFailure: true,
      }),
      user
        ? prisma.watchHistory.findUnique({
            where: {
              userId_seriesId: {
                userId: user.id,
                seriesId: id,
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
              userId_seriesId: {
                userId: user.id,
                seriesId: id,
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
  const hasAdminBypass = Boolean(admin) || hasAdminUserBypass;

  if (!series) {
    notFound();
  }

  const coverUrl = normalizeDisplayImageUrl(series.coverUrl);
  const detailDescription = toSeoDescription(
    series.description,
    `${series.title} dengan ${series.chapterCount} episode di ${settings.site.name}.`,
  );
  const episodeTotal = Math.max(series.chapterCount, series.episodes.length, 1);
  const vipLockFromEpisode = hasAdminBypass || isVipActive(user?.vipExpiresAt)
    ? null
    : getVipLockStartEpisode(vipSettings);
  const preferredInitialEpisode = clampEpisodeForVipAccess(
    watchHistory?.episodeIndex ?? 1,
    episodeTotal,
    vipLockFromEpisode,
  );

  const relatedSeries = await prisma.catalogSeries.findMany({
    where: {
      id: { not: series.id },
      OR: [
        { tags: { hasSome: series.tags.slice(0, 4) } },
        { platformId: series.platformId },
      ],
    },
    include: {
      platform: true,
    },
    take: 6,
    orderBy: [{ updatedAt: "desc" }],
  });

  const playHref = `/watch/${series.id}/play?episode=${preferredInitialEpisode}`;
  const shareUrl = await absoluteResolvedUrl(`/watch/${series.id}`);
  const telegramShareUrl =
    user?.authProvider === "telegram"
      ? await buildTelegramMiniAppStartAppLink(
          buildDramaShareStartParam({
            dramaId: series.id,
            referralCode: user.affiliateCode ?? null,
          }),
        )
      : null;

  return (
    <main className="route-transition-shell mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
        <div className="space-y-6">
          <Card className="glass-panel overflow-hidden rounded-[2.2rem] border-white/10">
            <CardContent className="p-0">
              <div className="relative aspect-[9/14] overflow-hidden bg-black sm:aspect-[9/12]">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={series.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    unoptimized={shouldBypassImageOptimization(coverUrl)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/65">
                    Poster belum tersedia
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,8,0.02),rgba(7,7,8,0.86))]" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <Badge className="border-accent/30 bg-accent-soft text-accent">
                    {series.platformId}
                  </Badge>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {series.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary">{episodeTotal} episode</Badge>
                    {series.playCount ? (
                      <Badge variant="secondary">{series.playCount} tayangan</Badge>
                    ) : null}
                    {series.lastDetailSyncedAt ? (
                      <Badge variant="secondary">Episode siap diputar</Badge>
                    ) : null}
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
                    {detailDescription}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {admin ? (
            <DramaDetailAdminDownloadPanel
              dramaId={series.id}
              episodeTotal={episodeTotal}
              initialEpisode={preferredInitialEpisode}
              className="w-full"
            />
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="glass-panel rounded-[2rem] border-white/10">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap gap-3">
                <PlayDramaButton href={playHref} label="Tonton sekarang" />
                <FavoriteDramaButton
                  dramaId={series.id}
                  redirectTo={`/watch/${series.id}`}
                  isFavorite={Boolean(favorite)}
                  className="h-12 rounded-full px-5"
                />
                <DramaDetailShareButton
                  title={series.title}
                  shareUrl={shareUrl}
                  telegramShareUrl={telegramShareUrl}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Episode siap
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {series.episodes.length}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Lanjut nonton
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    EP.{preferredInitialEpisode}
                  </p>
                </div>
              </div>

              {series.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {series.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-panel rounded-[2rem] border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
                  <Layers3 className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Daftar episode</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Episode VIP akan terkunci sesuai aturan akunmu.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: episodeTotal }).map((_, index) => {
                  const episode = index + 1;
                  const isLocked = isEpisodeVipLocked(episode, vipLockFromEpisode);
                  const episodePlayHref = `/watch/${series.id}/play?episode=${episode}`;
                  const episodeHref = isLocked
                    ? `/vip?next=${encodeURIComponent(episodePlayHref)}`
                    : episodePlayHref;

                  return (
                    <EpisodeGridLink
                      key={episode}
                      href={episodeHref}
                      episode={episode}
                      locked={isLocked}
                      isResume={episode === preferredInitialEpisode}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {relatedSeries.length > 0 ? (
            <Card className="glass-panel rounded-[2rem] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Drama serupa</h2>
                    
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {relatedSeries.map((item) => (
                    <DramaCard
                      key={item.id}
                      href={`/watch/${item.id}`}
                      title={item.title}
                      thumbUrl={item.coverUrl}
                      providerName={item.platform.name}
                      episodeCount={item.chapterCount}
                      extraMeta={item.tags.slice(0, 2).join(" • ") || item.playCount}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
