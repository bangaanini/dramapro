import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

import { VideoPlayer } from "@/components/video-player";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { toSeoDescription } from "@/lib/site";
import { getCurrentUser } from "@/lib/user-auth";
import {
  clampEpisodeForVipAccess,
  getVipLockStartEpisode,
  isVipActive,
} from "@/lib/vip";

export const dynamic = "force-dynamic";

const getDramaById = cache(async (id: string) =>
  prisma.drama.findFirst({
    where: {
      id,
      isStreamPlayable: true,
    },
  }),
);

function parseEpisodeSearchParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function generateMetadata(
  props: PageProps<"/watch/[id]/play">,
): Promise<Metadata> {
  const { id } = await props.params;
  const [drama, settings] = await Promise.all([getDramaById(id), getAppSettings()]);

  if (!drama) {
    return {
      title: "Player tidak ditemukan",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${drama.title} - Player`,
    description: toSeoDescription(
      drama.description,
      `${drama.title} player fullscreen di ${settings.site.name}.`,
    ),
    alternates: {
      canonical: `/watch/${drama.id}`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function WatchPlayerPage(
  props: PageProps<"/watch/[id]/play">,
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  const [drama, savedEpisodes, watchHistory, vipSettings] = await Promise.all([
    getDramaById(id),
    user
      ? prisma.savedEpisode.findMany({
          where: {
            userId: user.id,
            dramaId: id,
          },
          select: {
            episodeIndex: true,
          },
        })
      : Promise.resolve([]),
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
    prisma.vipSettings.findUnique({
      where: { id: "global" },
      select: {
        isEnabled: true,
        lockFromEpisode: true,
      },
    }),
  ]);

  if (!drama) {
    notFound();
  }

  const vipLockFromEpisode = isVipActive(user?.vipExpiresAt)
    ? null
    : getVipLockStartEpisode(vipSettings);
  const requestedEpisode = parseEpisodeSearchParam(searchParams.episode);
  const preferredInitialEpisode = clampEpisodeForVipAccess(
    requestedEpisode ?? watchHistory?.episodeIndex ?? 1,
    drama.episodeCount,
    vipLockFromEpisode,
  );
  const initialPositionSeconds =
    requestedEpisode && requestedEpisode !== watchHistory?.episodeIndex
      ? 0
      : watchHistory?.lastPositionSeconds ?? 0;

  return (
    <main className="route-transition-shell min-h-screen bg-black">
      <VideoPlayer
        internalDramaId={drama.id}
        title={drama.title}
        episodeCount={drama.episodeCount}
        watchValue={drama.watchValue}
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
