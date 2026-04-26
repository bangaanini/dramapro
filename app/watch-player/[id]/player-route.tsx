import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VideoPlayer } from "@/components/video-player";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAppSettings } from "@/lib/app-settings";
import { ensureSeriesHydrated, ensureSeriesPlayableFresh } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { toSeoDescription } from "@/lib/site";
import { getCurrentUser, userHasAdminVideoBypass } from "@/lib/user-auth";
import {
  clampEpisodeForVipAccess,
  getVipLockStartEpisode,
  isVipActive,
} from "@/lib/vip";

export const dynamic = "force-dynamic";

type WatchPlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    episode?: string | string[];
  }>;
};

const getSeriesById = cache(async (id: string) => ensureSeriesHydrated(id));

function parseEpisodeSearchParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function generateWatchPlayerMetadata(
  props: WatchPlayerPageProps,
): Promise<Metadata> {
  const { id } = await props.params;
  const [series, settings] = await Promise.all([getSeriesById(id), getAppSettings()]);

  if (!series) {
    return {
      title: "Player tidak ditemukan",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${series.title} - Player`,
    description: toSeoDescription(
      series.description,
      `${series.title} player fullscreen di ${settings.site.name}.`,
    ),
    alternates: {
      canonical: `/watch/${series.id}`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export async function WatchPlayerRoute(props: WatchPlayerPageProps) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  const [series, savedEpisodes, watchHistory, vipSettings, hasAdminBypass] =
    await Promise.all([
      ensureSeriesPlayableFresh(id, {
        hideOnFailure: true,
      }),
      user
        ? prisma.savedEpisode.findMany({
            where: {
              userId: user.id,
              seriesId: id,
            },
            select: {
              episodeIndex: true,
            },
          })
        : Promise.resolve([]),
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
      prisma.vipSettings.findUnique({
        where: { id: "global" },
        select: {
          isEnabled: true,
          lockFromEpisode: true,
        },
      }),
      userHasAdminVideoBypass(user),
    ]);

  if (!series) {
    notFound();
  }

  const vipLockFromEpisode = hasAdminBypass || isVipActive(user?.vipExpiresAt)
    ? null
    : getVipLockStartEpisode(vipSettings);
  const requestedEpisode = parseEpisodeSearchParam(searchParams.episode);
  const episodeCount = Math.max(series.chapterCount, series.episodes.length);
  const preferredInitialEpisode = clampEpisodeForVipAccess(
    requestedEpisode ?? watchHistory?.episodeIndex ?? 1,
    Math.max(episodeCount, 1),
    vipLockFromEpisode,
  );
  const initialPositionSeconds =
    requestedEpisode && requestedEpisode !== watchHistory?.episodeIndex
      ? 0
      : watchHistory?.lastPositionSeconds ?? 0;

  if (series.episodes.length === 0) {
    return (
      <main className="route-transition-shell mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
        <Card className="glass-panel rounded-[2rem] border-white/10">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-3">
              <Badge variant="secondary">{series.platformId}</Badge>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {series.title}
              </h1>
              <p className="text-sm leading-7 text-[var(--muted)]">
                Episode belum tersedia di database lokal. Detail judul ada, tetapi
                source video untuk serial ini belum berhasil di-hydrate dari upstream.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              Coba jalankan hydrate detail episode dari panel admin untuk provider ini,
              lalu buka player lagi.
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/watch/${series.id}`}
                className={buttonVariants({ size: "lg" })}
              >
                Kembali ke detail
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="route-transition-shell min-h-screen bg-black">
      <VideoPlayer
        internalDramaId={series.id}
        title={series.title}
        episodeCount={episodeCount}
        watchValue={series.playCount}
        immersive
        vipLockFromEpisode={vipLockFromEpisode}
        initialSavedEpisodes={savedEpisodes.map((entry) => entry.episodeIndex)}
        isSignedIn={Boolean(user)}
        initialEpisode={preferredInitialEpisode}
        initialPositionSeconds={initialPositionSeconds}
      />
    </main>
  );
}
