import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Bell, MessageCircle, Send, Zap } from "lucide-react";

import { DramaDetailShareButton } from "@/components/drama-detail-share-button";
import { DramaDetailAdminDownloadPanel } from "@/components/drama-detail-admin-download-panel";
import { EpisodeGridLink } from "@/components/episode-grid-link";
import { FavoriteDramaButton } from "@/components/favorite-drama-button";
import { PartnerBotDownloadPanel } from "@/components/partner-bot-download-panel";
import { PlayDramaButton } from "@/components/play-drama-button";
import { DramaCard } from "@/components/drama-card";
import { SaveEpisodeButton } from "@/components/save-episode-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
import { getPartnerDownloadBotsForOwner } from "@/lib/partner-downloads";
import { getCurrentUser, userHasAdminVideoBypass } from "@/lib/user-auth";
import {
  filterVisibleDisplayTags,
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

  const [
    series,
    watchHistory,
    favorite,
    vipSettings,
    settings,
    hasAdminUserBypass,
    partnerDownloadBots,
  ] = await Promise.all([
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
      user ? getPartnerDownloadBotsForOwner(user.id) : Promise.resolve([]),
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
  const fullDescription =
    series.description.replace(/\s+/g, " ").trim() || detailDescription;
  const episodeTotal = Math.max(series.chapterCount, series.episodes.length, 1);
  const visibleTags = filterVisibleDisplayTags(series.tags);
  const primaryTag = visibleTags.find((tag) => tag.trim().length > 0) ?? "Drama";
  const vipLockFromEpisode = hasAdminBypass || isVipActive(user?.vipExpiresAt)
    ? null
    : getVipLockStartEpisode(vipSettings);
  const preferredInitialEpisode = clampEpisodeForVipAccess(
    watchHistory?.episodeIndex ?? 1,
    episodeTotal,
    vipLockFromEpisode,
  );
  const [initialSavedEpisode] = user
    ? await Promise.all([
        prisma.savedEpisode.findUnique({
          where: {
            userId_seriesId_episodeIndex: {
              userId: user.id,
              seriesId: series.id,
              episodeIndex: preferredInitialEpisode,
            },
          },
          select: {
            id: true,
          },
        }),
      ])
    : [null];
  const detailHref = `/watch/${series.id}`;
  const telegramOpenUrl = settings.telegram.botUsername
    ? `https://t.me/${settings.telegram.botUsername}`
    : settings.telegram.supportUrl || settings.site.url;

  const relatedSeries = await prisma.catalogSeries.findMany({
    where: {
      id: { not: series.id },
      coverUrl: { not: "" },
      isHomepageVisible: true,
      platform: {
        isHomepageVisible: true,
      },
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
    <main className="route-transition-shell min-h-screen w-full overflow-hidden bg-[#050407] text-white">
      <SiteHeader current="watch" />

      <section className="relative px-3 pb-5 pt-5 sm:px-4 lg:px-8 lg:pb-6 lg:pt-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden border border-white/8 bg-[#070817] shadow-[0_26px_90px_rgba(0,0,0,0.44)] lg:rounded-[1.65rem]">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              priority
              className="scale-110 object-cover opacity-[0.18] blur-3xl"
              sizes="100vw"
              unoptimized={shouldBypassImageOptimization(coverUrl)}
            />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,122,69,0.18),transparent_28%),radial-gradient(circle_at_84%_22%,rgba(88,79,255,0.16),transparent_30%),linear-gradient(90deg,rgba(7,8,23,0.86),rgba(7,8,23,0.78)),linear-gradient(180deg,rgba(255,255,255,0.045),transparent)]" />

          <div className="relative grid gap-7 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(205px,280px)_minmax(0,1fr)] lg:gap-10 lg:px-7 lg:py-8 xl:gap-12 xl:px-8">
            <div className="mx-auto w-full max-w-[245px] lg:mx-0 lg:max-w-none">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[1.05rem] bg-white/6 shadow-[0_28px_72px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={series.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 245px, 280px"
                    unoptimized={shouldBypassImageOptimization(coverUrl)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/65">
                    Poster belum tersedia
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-center text-center lg:text-left">
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/8 px-3 text-xs font-semibold text-white/78">
                  {episodeTotal} Episode
                </span>
                <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/8 px-3 text-xs font-semibold text-white/78">
                  {primaryTag}
                </span>
              </div>

              <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {series.title}
              </h1>

              <p className="mt-5 max-w-4xl whitespace-pre-line text-sm leading-7 text-white/62 sm:text-base sm:leading-8 lg:line-clamp-4">
                {fullDescription}
              </p>

              {visibleTags.length > 1 ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {visibleTags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/10 bg-white/[0.055] px-2.5 py-1 text-xs font-medium text-white/58"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <PlayDramaButton
                  href={playHref}
                  label="Tonton Sekarang"
                  className="h-12 min-w-[190px] rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(255,122,69,0.34)] hover:bg-[var(--accent-strong)] sm:h-14 sm:min-w-[220px] sm:text-base"
                />
                <FavoriteDramaButton
                  dramaId={series.id}
                  redirectTo={detailHref}
                  isFavorite={Boolean(favorite)}
                  size="lg"
                  iconOnly
                  className={`h-12 w-12 rounded-xl px-0 sm:h-14 sm:w-14 ${
                    favorite
                      ? "border-accent/45 bg-accent-soft text-white"
                      : "border-white/12 bg-white/[0.045] text-white/84 hover:border-white/22 hover:bg-white/9"
                  }`}
                />
                <SaveEpisodeButton
                  dramaId={series.id}
                  episodeIndex={preferredInitialEpisode}
                  isSignedIn={Boolean(user)}
                  initialSaved={Boolean(initialSavedEpisode)}
                  redirectTo={detailHref}
                />
                <DramaDetailShareButton
                  title={series.title}
                  shareUrl={shareUrl}
                  telegramShareUrl={telegramShareUrl}
                  compact
                  iconOnly
                  className="h-12 w-12 rounded-xl border border-white/12 bg-white/[0.045] px-0 text-white/84 hover:border-white/22 hover:bg-white/9 sm:h-14 sm:w-14"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {admin ? (
        <section className="mx-auto w-full max-w-7xl px-3 pb-5 sm:px-4 lg:px-8">
          <DramaDetailAdminDownloadPanel
            dramaId={series.id}
            episodeTotal={episodeTotal}
            initialEpisode={preferredInitialEpisode}
            className="w-full"
          />
        </section>
      ) : null}

      {partnerDownloadBots.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-3 pb-5 sm:px-4 lg:px-8">
          <PartnerBotDownloadPanel
            bots={partnerDownloadBots}
            fixedDrama={{
              episodeTotal,
              id: series.id,
              initialEpisode: preferredInitialEpisode,
              providerName: series.platformId,
              thumbUrl: coverUrl,
              title: series.title,
            }}
            title="Download episode partner"
          />
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-3 pb-2 sm:px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.15rem] border border-cyan-300/10 bg-[#061021]/92 px-4 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.34)] sm:px-6 lg:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_13%_45%,rgba(24,173,255,0.18),transparent_27%),linear-gradient(90deg,rgba(255,255,255,0.04),transparent_45%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/20">
                <Send className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">
                  Lebih Seru di Telegram!
                </h2>
                <p className="mt-1 text-xs text-white/52">
                  Pengalaman nonton terbaik langsung dari chat dan Mini App.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/45">
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="size-3.5 text-cyan-300/80" />
                    Lebih cepat & ringan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Bell className="size-3.5 text-cyan-300/80" />
                    Notifikasi episode baru
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="size-3.5 text-cyan-300/80" />
                    Langsung dari chat
                  </span>
                </div>
              </div>
            </div>
            <a
              href={telegramOpenUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 text-sm font-semibold text-[#03111a] shadow-[0_16px_34px_rgba(34,211,238,0.22)] transition hover:brightness-110"
            >
              <Send className="size-4" />
              Buka di Telegram
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-3 pb-8 pt-4 sm:px-4 lg:px-8 lg:pb-10">
        <div className="rounded-[1.1rem] border border-white/8 bg-[#211827] px-4 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Daftar Episode
            </h2>
            {vipLockFromEpisode ? (
              <p className="inline-flex items-center gap-2 text-xs font-medium text-amber-200/80">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-[#21110a]">
                  P
                </span>
                Episode premium mulai dari {vipLockFromEpisode}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-16">
            {Array.from({ length: episodeTotal }).map((_, index) => {
              const episode = index + 1;
              const isLocked = isEpisodeVipLocked(episode, vipLockFromEpisode);
              const episodePlayHref = `/watch/${series.id}/play?episode=${episode}`;
              const lockedEpisodeParams = new URLSearchParams({
                premiumEpisode: String(episode),
                premiumTitle: series.title,
                premiumNext: episodePlayHref,
              });
              const episodeHref = isLocked
                ? `?${lockedEpisodeParams.toString()}`
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
        </div>
      </section>

      {relatedSeries.length > 0 ? (
        <section className="border-t border-white/7 bg-[#060716] px-3 py-7 sm:px-4 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
              Kamu Mungkin Suka Ini
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5">
              {relatedSeries.map((item) => (
                <DramaCard
                  key={item.id}
                  href={`/watch/${item.id}`}
                  title={item.title}
                  thumbUrl={item.coverUrl}
                  providerName={item.platform.name}
                  episodeCount={item.chapterCount}
                  hideCta
                  compact
                  hideCompactMeta
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
