import { Prisma, type CatalogSyncJob } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CATALOG_PLATFORM_IDS,
  CATALOG_PLATFORM_LABELS,
  DEFAULT_CATALOG_LANGUAGE,
  DEFAULT_CATALOG_PLATFORM,
  UpstreamPageInfo,
  fetchPlatformLanguages,
  fetchPlatformSearch,
  fetchPlatformSeriesDetail,
  fetchPlatformTabdata,
  fetchPlatformTabfeed,
  fetchPlatformTablist,
} from "@/lib/catalog-upstream";

const DEFAULT_HOME_PAGE_SIZE = 18;
const SYNC_ALL_DETAIL_BATCH_SIZE = 10;
const SYNC_ALL_DETAIL_CONCURRENCY = 4;
const SYNC_ALL_JOB_LEASE_MS = 60_000;
const HOMEPAGE_HIDDEN_REASON_PENDING_AUDIT = "pending_audit";
const HOMEPAGE_HIDDEN_REASON_ON_DEMAND_FAILED = "detail_on_demand_failed";
const CATALOG_DETAIL_TTL_MINUTES = Number.parseInt(
  process.env.CATALOG_DETAIL_TTL_MINUTES?.trim() || "360",
  10,
);
const SHOULD_AUDIT_AFTER_INDEX =
  process.env.CATALOG_SYNC_AUDIT_AFTER_INDEX?.trim().toLowerCase() === "true";

const SYNC_ALL_RUNNING_STATUSES = ["queued", "running"] as const;

type SyncAllJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

type SyncAllJobPhase =
  | "init-platform"
  | "sync-tabs"
  | "audit-series"
  | "completed";

type SyncAllLogEntry = {
  at: string;
  level: "info" | "error";
  message: string;
  platformId?: string;
};

type SyncAllJobRecord = CatalogSyncJob;

export type CatalogSeriesCard = {
  id: string;
  title: string;
  thumbUrl: string;
  platformName: string;
  episodeCount: number;
  description: string;
  playCount: string;
  tags: string[];
};

export type CatalogSyncAllJobPayload = {
  id: string;
  status: string;
  languageCode: string;
  phase: string;
  platformIndex: number;
  currentPlatformId: string;
  currentTabName: string;
  totalPlatforms: number;
  completedPlatforms: number;
  totalTabs: number;
  completedTabs: number;
  totalTitles: number;
  totalEpisodes: number;
  pendingDetails: number;
  processedDetails: number;
  errorCount: number;
  recentErrors: SyncAllLogEntry[];
  recentLogs: SyncAllLogEntry[];
  lastMessage: string;
  progressPercent: number;
  isWorkerActive: boolean;
  leaseExpiresAt: string | null;
  lastHeartbeatAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

function checksumEpisode(input: {
  episodeIndex: number;
  episodeLabel: string;
  videoUrl: string;
}) {
  return `${input.episodeIndex}:${input.episodeLabel}:${input.videoUrl}`;
}

function isSeriesDetailStale(lastDetailSyncedAt: Date | null) {
  if (!lastDetailSyncedAt) {
    return true;
  }

  const ttlMinutes = Number.isFinite(CATALOG_DETAIL_TTL_MINUTES)
    ? Math.max(1, CATALOG_DETAIL_TTL_MINUTES)
    : 360;

  return Date.now() - lastDetailSyncedAt.getTime() > ttlMinutes * 60 * 1000;
}

function parseEpisodeIndexFromLabel(label: string) {
  const match = label.match(/\d+/u);
  const parsed = Number.parseInt(match?.[0] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeChapterEpisodeIndex(
  chapter: {
    eps: string;
    index: number | string;
  },
  usesZeroBasedIndex: boolean,
) {
  const rawIndex = Number(chapter.index);

  if (Number.isFinite(rawIndex)) {
    const normalizedIndex = usesZeroBasedIndex ? rawIndex + 1 : rawIndex;
    return normalizedIndex > 0 ? normalizedIndex : null;
  }

  return parseEpisodeIndexFromLabel(String(chapter.eps ?? ""));
}

async function setSeriesHomepageVisibility(
  seriesId: string,
  isHomepageVisible: boolean,
  homepageHiddenReason: string | null,
) {
  await prisma.catalogSeries.update({
    where: {
      id: seriesId,
    },
    data: {
      isHomepageVisible,
      homepageHiddenReason,
    },
  });
}

async function hideProviderSeriesFromHomepage(
  platformId: string,
  languageCode: string,
  homepageHiddenReason: string,
) {
  await prisma.catalogSeries.updateMany({
    where: {
      platformId,
      language: {
        code: languageCode,
      },
      isHomepageVisible: true,
    },
    data: {
      isHomepageVisible: false,
      homepageHiddenReason,
    },
  });
}

async function resetFailedSeriesSyncStates(languageCode: string) {
  await prisma.catalogSyncState.updateMany({
    where: {
      scope: "series",
      status: "failed",
      series: {
        language: {
          code: languageCode,
        },
      },
    },
    data: {
      status: "pending",
      lastError: "",
    },
  });
}

async function resetTabSyncStates(languageCode: string) {
  await prisma.catalogSyncState.updateMany({
    where: {
      scope: "tab",
      tab: {
        language: {
          code: languageCode,
        },
      },
    },
    data: {
      status: "pending",
      hasMore: false,
      lastPageInfo: Prisma.DbNull,
      lastSyncedAt: null,
      lastError: "",
    },
  });
}

async function ensureCatalogPlatformsRegistered() {
  for (const platformId of CATALOG_PLATFORM_IDS) {
    await prisma.catalogPlatform.upsert({
      where: { id: platformId },
      create: {
        id: platformId,
        name: CATALOG_PLATFORM_LABELS[platformId],
        isActive: true,
        isHomepageVisible: true,
      },
      update: {
        name: CATALOG_PLATFORM_LABELS[platformId],
        isActive: true,
      },
    });
  }
}

async function syncPlatformLanguages(
  platformId: string,
  defaultLanguageCode = DEFAULT_CATALOG_LANGUAGE,
) {
  const languages = await fetchPlatformLanguages(platformId);
  const supportedCodes = new Set(languages.supported);

  for (const code of supportedCodes) {
    await prisma.catalogLanguage.upsert({
      where: {
        platformId_code: {
          platformId,
          code,
        },
      },
      create: {
        platformId,
        code,
        upstreamCode: languages.mapping[code] ?? null,
        isDefault: code === defaultLanguageCode,
        isActive: true,
      },
      update: {
        upstreamCode: languages.mapping[code] ?? null,
        isDefault: code === defaultLanguageCode,
        isActive: true,
      },
    });
  }

  if (!supportedCodes.has(defaultLanguageCode)) {
    const fallbackLanguage = await prisma.catalogLanguage.findFirst({
      where: {
        platformId,
        code: {
          in: Array.from(supportedCodes),
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    if (fallbackLanguage) {
      await prisma.catalogLanguage.update({
        where: { id: fallbackLanguage.id },
        data: {
          isDefault: true,
          isActive: true,
        },
      });
    }
  }
}

async function getCatalogPlatformWithLanguage(
  platformId = DEFAULT_CATALOG_PLATFORM,
  languageCode = DEFAULT_CATALOG_LANGUAGE,
) {
  const platform = await prisma.catalogPlatform.findUnique({
    where: { id: platformId },
  });

  if (!platform) {
    throw new Error("Catalog has not been initialized yet.");
  }

  const language =
    (await prisma.catalogLanguage.findUnique({
      where: {
        platformId_code: {
          platformId,
          code: languageCode,
        },
      },
    })) ??
    (await prisma.catalogLanguage.findFirst({
      where: {
        platformId,
        isActive: true,
      },
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    }));

  if (!language) {
    throw new Error(`Catalog language is not initialized for ${platformId}.`);
  }

  return {
    platform,
    language,
  };
}

async function getStoredTabs(platformId: string, languageId: string) {
  return prisma.catalogTab.findMany({
    where: {
      platformId,
      languageId,
      isActive: true,
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });
}

function toCatalogSeriesCard(
  series: {
    id: string;
    title: string;
    coverUrl: string;
    chapterCount: number;
    description: string;
    playCount: string;
    tags: string[];
    platform: {
      name: string;
    };
  },
): CatalogSeriesCard {
  return {
    id: series.id,
    title: series.title,
    thumbUrl: series.coverUrl,
    platformName: series.platform.name,
    episodeCount: series.chapterCount,
    description: series.description,
    playCount: series.playCount,
    tags: series.tags,
  };
}

async function upsertCatalogSeriesSummaries(
  input: {
    platformId: string;
    languageId: string;
    entries: Array<{
      id: string;
      name: string;
      cover: string;
      chapterCount: number;
      introduction: string;
      tags: string[];
      playCount: string;
    }>;
  },
) {
  const seriesIds: string[] = [];

  for (const entry of input.entries) {
    if (!entry.id || !entry.name) {
      continue;
    }

    const uniqueKey = {
      platformId: input.platformId,
      languageId: input.languageId,
      upstreamSeriesId: entry.id,
    };
    const existing = await prisma.catalogSeries.findUnique({
      where: {
        platformId_languageId_upstreamSeriesId: uniqueKey,
      },
      select: {
        id: true,
        lastDetailSyncedAt: true,
        homepageHiddenReason: true,
      },
    });
    const shouldRestoreIndexedVisibility =
      !existing ||
      existing.homepageHiddenReason === HOMEPAGE_HIDDEN_REASON_PENDING_AUDIT;
    const shouldQueueDetailRefresh = !existing || !existing.lastDetailSyncedAt;

    const saved = await prisma.catalogSeries.upsert({
      where: {
        platformId_languageId_upstreamSeriesId: {
          ...uniqueKey,
        },
      },
      create: {
        platformId: input.platformId,
        languageId: input.languageId,
        upstreamSeriesId: entry.id,
        title: entry.name,
        coverUrl: entry.cover,
        chapterCount: entry.chapterCount,
        description: entry.introduction,
        tags: entry.tags,
        playCount: entry.playCount,
        isHomepageVisible: true,
        homepageHiddenReason: null,
      },
      update: {
        title: entry.name,
        coverUrl: entry.cover,
        chapterCount: entry.chapterCount,
        description: entry.introduction,
        tags: entry.tags,
        playCount: entry.playCount,
        ...(shouldRestoreIndexedVisibility
          ? {
              isHomepageVisible: true,
              homepageHiddenReason: null,
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (shouldQueueDetailRefresh) {
      await prisma.catalogSyncState.upsert({
        where: {
          seriesId: saved.id,
        },
        create: {
          seriesId: saved.id,
          scope: "series",
          status: "pending",
          hasMore: false,
          lastError: "",
        },
        update: {
          status: "pending",
          hasMore: false,
          lastError: "",
        },
      });
    }

    seriesIds.push(saved.id);
  }

  return seriesIds;
}

async function replaceTabMemberships(
  tabId: string,
  pageNo: number,
  seriesIds: string[],
) {
  if (pageNo <= 1) {
    await prisma.catalogTabSeries.deleteMany({
      where: { tabId },
    });
  }

  for (const [index, seriesId] of seriesIds.entries()) {
    const rank = Math.max(0, (pageNo - 1) * 1000 + index);

    await prisma.catalogTabSeries.upsert({
      where: {
        tabId_seriesId: {
          tabId,
          seriesId,
        },
      },
      create: {
        tabId,
        seriesId,
        rank,
        sourcePageNo: pageNo,
      },
      update: {
        rank,
        sourcePageNo: pageNo,
      },
    });
  }
}

async function saveTabSyncState(
  tabId: string,
  pageInfo: UpstreamPageInfo,
  status: "synced" | "failed",
  lastError = "",
) {
  await prisma.catalogSyncState.upsert({
    where: { tabId },
    create: {
      tabId,
      scope: "tab",
      status,
      hasMore: Boolean(pageInfo.has_more),
      lastPageInfo: pageInfo as Prisma.InputJsonValue,
      lastSyncedAt: status === "synced" ? new Date() : null,
      lastError,
    },
    update: {
      status,
      hasMore: Boolean(pageInfo.has_more),
      lastPageInfo: pageInfo as Prisma.InputJsonValue,
      lastSyncedAt: status === "synced" ? new Date() : undefined,
      lastError,
    },
  });
}

export async function initializeCatalog() {
  return initializeCatalogForPlatform(
    DEFAULT_CATALOG_PLATFORM,
    DEFAULT_CATALOG_LANGUAGE,
  );
}

export async function initializeCatalogForPlatform(
  platformId = DEFAULT_CATALOG_PLATFORM,
  languageCode = DEFAULT_CATALOG_LANGUAGE,
) {
  await ensureCatalogPlatformsRegistered();

  for (const candidatePlatformId of CATALOG_PLATFORM_IDS) {
    try {
      await syncPlatformLanguages(
        candidatePlatformId,
        candidatePlatformId === platformId
          ? languageCode
          : DEFAULT_CATALOG_LANGUAGE,
      );
    } catch (error) {
      const existingLanguage = await prisma.catalogLanguage.findFirst({
        where: {
          platformId: candidatePlatformId,
          isActive: true,
        },
      });

      if (!existingLanguage && candidatePlatformId === platformId) {
        throw error;
      }
    }
  }

  const initializedLanguage = await prisma.catalogLanguage.findFirst({
    where: {
      platformId,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });

  if (!initializedLanguage) {
    throw new Error(`Catalog language is not initialized for ${platformId}.`);
  }

  return syncTablist(platformId, languageCode);
}

export async function syncTablist(
  platform = DEFAULT_CATALOG_PLATFORM,
  languageCode = DEFAULT_CATALOG_LANGUAGE,
) {
  const platformRecord = await prisma.catalogPlatform.findUnique({
    where: { id: platform },
  });

  if (!platformRecord) {
    throw new Error(`Catalog platform ${platform} is not initialized.`);
  }

  const language = await prisma.catalogLanguage.findUnique({
    where: {
      platformId_code: {
        platformId: platform,
        code: languageCode,
      },
    },
  });

  if (!language) {
    throw new Error(`Catalog language ${languageCode} is not initialized.`);
  }

  let upstreamTabs;

  try {
    upstreamTabs = await fetchPlatformTablist(platform, languageCode);
  } catch (error) {
    const cachedTabs = await getStoredTabs(platform, language.id);

    if (cachedTabs.length > 0) {
      return cachedTabs;
    }

    throw error;
  }

  await prisma.catalogTab.updateMany({
    where: {
      platformId: platform,
      languageId: language.id,
    },
    data: {
      isActive: false,
    },
  });

  for (const [index, tab] of upstreamTabs.entries()) {
    await prisma.catalogTab.upsert({
      where: {
        languageId_type_positionIndex_sortOrder: {
          languageId: language.id,
          type: tab.type,
          positionIndex: tab.position_index,
          sortOrder: index,
        },
      },
      create: {
        platformId: platform,
        languageId: language.id,
        type: tab.type,
        name: tab.name,
        tabKey: tab.tab_key,
        positionIndex: tab.position_index,
        sortOrder: index,
        isActive: true,
      },
      update: {
        name: tab.name,
        tabKey: tab.tab_key,
        isActive: true,
      },
    });
  }

  return getStoredTabs(platform, language.id);
}

export async function syncTabFirstPage(tabId: string) {
  const tab = await prisma.catalogTab.findUnique({
    where: { id: tabId },
    include: {
      language: true,
    },
  });

  if (!tab) {
    throw new Error("Catalog tab not found.");
  }

  try {
    const payload = await fetchPlatformTabdata({
      platform: tab.platformId,
      lang: tab.language.code,
      key: tab.tabKey,
      positionIndex: tab.positionIndex,
      type: tab.type,
    });
    const seriesIds = await upsertCatalogSeriesSummaries({
      platformId: tab.platformId,
      languageId: tab.languageId,
      entries: payload.entries,
    });

    await replaceTabMemberships(tab.id, payload.pageInfo.pageNo ?? 1, seriesIds);
    await saveTabSyncState(tab.id, payload.pageInfo, "synced");

    return {
      tabId: tab.id,
      syncedEntries: seriesIds.length,
      pageInfo: payload.pageInfo,
    };
  } catch (error) {
    await saveTabSyncState(
      tab.id,
      { has_more: false },
      "failed",
      error instanceof Error ? error.message : "Sync failed.",
    );
    throw error;
  }
}

export async function syncTabNextPage(tabId: string) {
  const tab = await prisma.catalogTab.findUnique({
    where: { id: tabId },
    include: {
      language: true,
      syncState: true,
    },
  });

  if (!tab) {
    throw new Error("Catalog tab not found.");
  }

  const pageInfo = tab.syncState?.lastPageInfo as UpstreamPageInfo | null;

  if (!pageInfo || !pageInfo.has_more) {
    return {
      tabId,
      syncedEntries: 0,
      pageInfo: pageInfo ?? { has_more: false },
    };
  }

  try {
    const payload = await fetchPlatformTabfeed({
      platform: tab.platformId,
      lang: tab.language.code,
      pageInfo,
    });
    const seriesIds = await upsertCatalogSeriesSummaries({
      platformId: tab.platformId,
      languageId: tab.languageId,
      entries: payload.entries,
    });

    await replaceTabMemberships(tab.id, payload.pageInfo.pageNo ?? 1, seriesIds);
    await saveTabSyncState(tab.id, payload.pageInfo, "synced");

    return {
      tabId: tab.id,
      syncedEntries: seriesIds.length,
      pageInfo: payload.pageInfo,
    };
  } catch (error) {
    await saveTabSyncState(
      tab.id,
      pageInfo,
      "failed",
      error instanceof Error ? error.message : "Sync failed.",
    );
    throw error;
  }
}

export async function hydrateSeriesDetail(seriesId: string) {
  const series = await prisma.catalogSeries.findUnique({
    where: { id: seriesId },
    include: {
      language: true,
      platform: true,
    },
  });

  if (!series) {
    throw new Error("Catalog series not found.");
  }

  const payload = await fetchPlatformSeriesDetail(series.upstreamSeriesId, {
    platform: series.platformId,
    lang: series.language.code,
  });

  const chapters = payload.chapters ?? [];
  const numericChapterIndexes = chapters
    .map((chapter) => Number(chapter.index))
    .filter((index) => Number.isFinite(index));
  const usesZeroBasedIndex =
    numericChapterIndexes.length > 0 && Math.min(...numericChapterIndexes) === 0;
  const validChapters = chapters
    .map((chapter) => {
      const episodeIndex = normalizeChapterEpisodeIndex(
        {
          eps: String(chapter.eps ?? ""),
          index: chapter.index,
        },
        usesZeroBasedIndex,
      );

      if (!episodeIndex) {
        return null;
      }

      const videoUrl = String(chapter.videoPath ?? "").trim();

      if (!videoUrl) {
        return null;
      }

      return {
        episodeIndex,
        episodeLabel: String(chapter.eps || `EP-${episodeIndex}`).trim(),
        videoUrl,
        subtitles: (chapter.subtitle ?? []) as Prisma.InputJsonValue,
      };
    })
    .filter(
      (
        chapter,
      ): chapter is {
        episodeIndex: number;
        episodeLabel: string;
        videoUrl: string;
        subtitles: Prisma.InputJsonValue;
      } => Boolean(chapter),
    );
  const normalizedPlayCount = String(
    payload.book.playCount ?? series.playCount ?? "",
  ).trim();
  const normalizedChapterCount = validChapters.length;
  const normalizedTags = Array.isArray(payload.book.tags)
    ? payload.book.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : series.tags;

  await prisma.catalogSeries.update({
    where: { id: series.id },
    data: {
      title: payload.book.name || series.title,
      description: payload.book.introduction || series.description,
      chapterCount: normalizedChapterCount,
      coverUrl: payload.book.cover ?? series.coverUrl,
      tags: normalizedTags.length > 0 ? normalizedTags : series.tags,
      playCount: normalizedPlayCount,
      lastDetailSyncedAt: new Date(),
      isHomepageVisible: validChapters.length > 0,
      homepageHiddenReason:
        validChapters.length > 0 ? null : "no_episodes_after_sync",
    },
  });

  await prisma.catalogEpisode.deleteMany({
    where: {
      seriesId: series.id,
      ...(validChapters.length > 0
        ? {
            episodeIndex: {
              notIn: validChapters.map((chapter) => chapter.episodeIndex),
            },
          }
        : {}),
    },
  });

  for (const record of validChapters) {
    await prisma.catalogEpisode.upsert({
      where: {
        seriesId_episodeIndex: {
          seriesId: series.id,
          episodeIndex: record.episodeIndex,
        },
      },
      create: {
        seriesId: series.id,
        ...record,
        quality: 720,
        checksum: checksumEpisode(record),
      },
      update: {
        episodeLabel: record.episodeLabel,
        videoUrl: record.videoUrl,
        subtitles: record.subtitles,
        quality: 720,
        checksum: checksumEpisode(record),
      },
    });
  }

  await prisma.catalogSyncState.upsert({
    where: { seriesId: series.id },
    create: {
      seriesId: series.id,
      scope: "series",
      status: validChapters.length > 0 ? "synced" : "failed",
      hasMore: false,
      lastSyncedAt: validChapters.length > 0 ? new Date() : null,
      lastError: validChapters.length > 0 ? "" : "Series tidak memiliki episode valid.",
    },
    update: {
      status: validChapters.length > 0 ? "synced" : "failed",
      hasMore: false,
      lastSyncedAt: validChapters.length > 0 ? new Date() : null,
      lastError: validChapters.length > 0 ? "" : "Series tidak memiliki episode valid.",
    },
  });

  return prisma.catalogSeries.findUnique({
    where: { id: series.id },
    include: {
      episodes: {
        orderBy: {
          episodeIndex: "asc",
        },
      },
    },
  });
}

export async function hydratePendingSeriesDetails(
  limit = 12,
  input?: {
    platformId?: string;
    languageCode?: string;
  },
) {
  const filters =
    input?.platformId || input?.languageCode
      ? await getCatalogPlatformWithLanguage(
          input?.platformId ?? DEFAULT_CATALOG_PLATFORM,
          input?.languageCode ?? DEFAULT_CATALOG_LANGUAGE,
        )
      : null;

  const pending = await prisma.catalogSeries.findMany({
    where: {
      ...(filters
        ? {
            platformId: filters.platform.id,
            languageId: filters.language.id,
          }
        : {}),
      OR: [
        { lastDetailSyncedAt: null },
        { chapterCount: 0 },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 50),
    select: {
      id: true,
    },
  });

  const results = [];

  for (const item of pending) {
    results.push(await hydrateSeriesDetail(item.id));
  }

  return results;
}

function asSyncAllEntries(value: Prisma.JsonValue | null): SyncAllLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return (value as unknown[])
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((item) => ({
      at: typeof item.at === "string" ? item.at : new Date().toISOString(),
      level: item.level === "error" ? ("error" as const) : ("info" as const),
      message: typeof item.message === "string" ? item.message : "",
      platformId: typeof item.platformId === "string" ? item.platformId : undefined,
    }))
    .filter((item) => item.message.length > 0);
}

function pushSyncAllEntry(
  value: Prisma.JsonValue | null,
  entry: SyncAllLogEntry,
  limit = 12,
) {
  return [...asSyncAllEntries(value), entry].slice(-limit) as Prisma.InputJsonValue;
}

function syncAllEntry(
  level: SyncAllLogEntry["level"],
  message: string,
  platformId?: string,
): SyncAllLogEntry {
  return {
    at: new Date().toISOString(),
    level,
    message,
    platformId,
  };
}

function buildSyncAllLeaseData(runnerId: string, now = new Date()) {
  return {
    runnerId,
    leaseExpiresAt: new Date(now.getTime() + SYNC_ALL_JOB_LEASE_MS),
    lastHeartbeatAt: now,
  } satisfies Pick<
    Prisma.CatalogSyncJobUpdateInput,
    "runnerId" | "leaseExpiresAt" | "lastHeartbeatAt"
  >;
}

function clearSyncAllLeaseData() {
  return {
    runnerId: null,
    leaseExpiresAt: null,
  } satisfies Pick<Prisma.CatalogSyncJobUpdateInput, "runnerId" | "leaseExpiresAt">;
}

function buildClaimableSyncAllJobWhere(
  runnerId: string,
  now: Date,
): Prisma.CatalogSyncJobWhereInput {
  return {
    OR: [
      { runnerId },
      { runnerId: null },
      { leaseExpiresAt: null },
      { leaseExpiresAt: { lte: now } },
    ],
  };
}

function buildAvailableSyncAllJobWhere(now: Date): Prisma.CatalogSyncJobWhereInput {
  return {
    OR: [
      { runnerId: null },
      { leaseExpiresAt: null },
      { leaseExpiresAt: { lte: now } },
    ],
  };
}

function isSyncAllWorkerActive(job: SyncAllJobRecord, now = new Date()) {
  return Boolean(
    job.status === "running" &&
      job.runnerId &&
      job.leaseExpiresAt &&
      job.leaseExpiresAt.getTime() > now.getTime(),
  );
}

function serializeSyncAllJob(
  job: SyncAllJobRecord,
): CatalogSyncAllJobPayload {
  const indexProgress =
    job.totalPlatforms > 0
      ? (job.completedPlatforms / job.totalPlatforms) * 75
      : 0;
  const tabProgress =
    job.totalTabs > 0 ? (job.completedTabs / job.totalTabs) * 10 : 0;
  const auditDenominator = job.pendingDetails + job.processedDetails;
  const auditProgress =
    auditDenominator > 0
      ? (job.processedDetails / auditDenominator) * 15
      : job.phase === "audit-series" || job.phase === "completed"
        ? 15
        : 0;
  const progressPercent =
    job.status === "completed"
      ? 100
      : Math.min(
          99,
          Math.max(
            0,
            Math.round(indexProgress + tabProgress + auditProgress),
          ),
        );
  const workerActive = isSyncAllWorkerActive(job);

  return {
    id: job.id,
    status: job.status,
    languageCode: job.languageCode,
    phase: job.phase,
    platformIndex: job.platformIndex,
    currentPlatformId: job.currentPlatformId,
    currentTabName: job.currentTabName,
    totalPlatforms: job.totalPlatforms,
    completedPlatforms: job.completedPlatforms,
    totalTabs: job.totalTabs,
    completedTabs: job.completedTabs,
    totalTitles: job.totalTitles,
    totalEpisodes: job.totalEpisodes,
    pendingDetails: job.pendingDetails,
    processedDetails: job.processedDetails,
    errorCount: job.errorCount,
    recentErrors: asSyncAllEntries(job.recentErrors),
    recentLogs: asSyncAllEntries(job.recentLogs),
    lastMessage: job.lastMessage,
    progressPercent,
    isWorkerActive: workerActive,
    leaseExpiresAt: job.leaseExpiresAt?.toISOString() ?? null,
    lastHeartbeatAt: job.lastHeartbeatAt?.toISOString() ?? null,
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    updatedAt: job.updatedAt.toISOString(),
  };
}

async function countSyncAllCounters(languageCode: string) {
  const [
    totalTabs,
    completedTabs,
    totalTitles,
    totalEpisodes,
    pendingDetails,
    processedDetails,
  ] =
    await Promise.all([
      prisma.catalogTab.count({
        where: {
          isActive: true,
          language: {
            code: languageCode,
          },
        },
      }),
      prisma.catalogTab.count({
        where: {
          isActive: true,
          language: {
            code: languageCode,
          },
          syncState: {
            is: {
              status: "synced",
              hasMore: false,
            },
          },
        },
      }),
      prisma.catalogSeries.count({
        where: {
          language: {
            code: languageCode,
          },
        },
      }),
      prisma.catalogEpisode.count({
        where: {
          series: {
            language: {
              code: languageCode,
            },
          },
        },
      }),
      prisma.catalogSeries.count({
        where: {
          language: {
            code: languageCode,
          },
          OR: [{ lastDetailSyncedAt: null }, { chapterCount: 0 }],
          NOT: {
            syncState: {
              is: {
                status: "failed",
              },
            },
          },
        },
      }),
      prisma.catalogSeries.count({
        where: {
          language: {
            code: languageCode,
          },
          lastDetailSyncedAt: {
            not: null,
          },
          chapterCount: {
            gt: 0,
          },
        },
      }),
    ]);

  return {
    totalTabs,
    completedTabs,
    totalTitles,
    totalEpisodes,
    pendingDetails,
    processedDetails,
  };
}

async function refreshSyncAllJobCounters(
  job: SyncAllJobRecord,
  runnerId?: string,
) {
  const counters = await countSyncAllCounters(job.languageCode);

  return prisma.catalogSyncJob.update({
    where: {
      id: job.id,
    },
    data: {
      ...counters,
      ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
    },
  });
}

async function getSyncAllJobOrLatest(jobId?: string) {
  if (jobId) {
    return prisma.catalogSyncJob.findUnique({
      where: {
        id: jobId,
      },
    });
  }

  return prisma.catalogSyncJob.findFirst({
    where: {
      status: {
        in: [...SYNC_ALL_RUNNING_STATUSES],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function claimCatalogSyncAllJobForRunner(
  runnerId: string,
  jobId?: string,
) {
  const now = new Date();

  if (jobId) {
    const job = await prisma.catalogSyncJob.findUnique({
      where: {
        id: jobId,
      },
    });

    if (
      !job ||
      !SYNC_ALL_RUNNING_STATUSES.includes(job.status as "queued" | "running")
    ) {
      return null;
    }

    const claimed = await prisma.catalogSyncJob.updateMany({
      where: {
        id: job.id,
        status: {
          in: [...SYNC_ALL_RUNNING_STATUSES],
        },
        ...buildClaimableSyncAllJobWhere(runnerId, now),
      },
      data: {
        status: "running" satisfies SyncAllJobStatus,
        startedAt: job.startedAt ?? now,
        ...buildSyncAllLeaseData(runnerId, now),
      },
    });

    if (claimed.count === 0) {
      return null;
    }

    return prisma.catalogSyncJob.findUnique({
      where: {
        id: job.id,
      },
    });
  }

  const ownedJob = await prisma.catalogSyncJob.findFirst({
    where: {
      status: {
        in: [...SYNC_ALL_RUNNING_STATUSES],
      },
      runnerId,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  const candidateJobs = ownedJob
    ? [ownedJob]
    : await prisma.catalogSyncJob.findMany({
        where: {
          status: {
            in: [...SYNC_ALL_RUNNING_STATUSES],
          },
          ...buildAvailableSyncAllJobWhere(now),
        },
        orderBy: [{ createdAt: "asc" }, { updatedAt: "asc" }],
        take: 5,
      });

  for (const candidate of candidateJobs) {
    const claimed = await prisma.catalogSyncJob.updateMany({
      where: {
        id: candidate.id,
        status: {
          in: [...SYNC_ALL_RUNNING_STATUSES],
        },
        ...buildClaimableSyncAllJobWhere(runnerId, now),
      },
      data: {
        status: "running" satisfies SyncAllJobStatus,
        startedAt: candidate.startedAt ?? now,
        ...buildSyncAllLeaseData(runnerId, now),
      },
    });

    if (claimed.count > 0) {
      return prisma.catalogSyncJob.findUnique({
        where: {
          id: candidate.id,
        },
      });
    }
  }

  return null;
}

export async function getLatestCatalogSyncAllJob() {
  const job = await prisma.catalogSyncJob.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
  });

  return job ? serializeSyncAllJob(job) : null;
}

export async function startCatalogSyncAllJob(languageCode = DEFAULT_CATALOG_LANGUAGE) {
  const normalizedLanguage = languageCode.trim() || DEFAULT_CATALOG_LANGUAGE;
  const now = new Date();
  const log = syncAllEntry(
    "info",
    `Sync all dimulai untuk bahasa ${normalizedLanguage.toUpperCase()}.`,
  );

  await prisma.catalogSyncJob.updateMany({
    where: {
      status: {
        in: [...SYNC_ALL_RUNNING_STATUSES],
      },
    },
    data: {
      status: "cancelled" satisfies SyncAllJobStatus,
      finishedAt: now,
      lastMessage: "Job diganti oleh sync all baru.",
      ...clearSyncAllLeaseData(),
    },
  });

  const job = await prisma.catalogSyncJob.create({
    data: {
      status: "queued" satisfies SyncAllJobStatus,
      languageCode: normalizedLanguage,
      phase: "init-platform" satisfies SyncAllJobPhase,
      totalPlatforms: CATALOG_PLATFORM_IDS.length,
      lastMessage: log.message,
      recentLogs: [log] as Prisma.InputJsonValue,
      ...clearSyncAllLeaseData(),
      lastHeartbeatAt: null,
    },
  });

  await resetFailedSeriesSyncStates(normalizedLanguage);
  await resetTabSyncStates(normalizedLanguage);

  return serializeSyncAllJob(await refreshSyncAllJobCounters(job));
}

export async function completeCatalogSyncAllJobAfterIndex(
  jobId: string,
  runnerId?: string,
) {
  const job = await prisma.catalogSyncJob.findUnique({
    where: {
      id: jobId,
    },
  });

  if (!job) {
    return null;
  }

  const message = "Index katalog selesai untuk semua provider. Audit belum dijalankan.";
  const entry = syncAllEntry("info", message);
  const updated = await prisma.catalogSyncJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: "completed" satisfies SyncAllJobStatus,
      phase: "completed" satisfies SyncAllJobPhase,
      completedPlatforms: job.totalPlatforms,
      currentPlatformId: "",
      currentTabId: null,
      currentTabName: "",
      finishedAt: new Date(),
      lastMessage: message,
      recentLogs: pushSyncAllEntry(job.recentLogs, entry),
      lastHeartbeatAt: new Date(),
      ...clearSyncAllLeaseData(),
    },
  });

  return serializeSyncAllJob(await refreshSyncAllJobCounters(updated, runnerId));
}

async function markSyncAllJobFailed(
  job: SyncAllJobRecord,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Sync all gagal dijalankan.";
  const entry = syncAllEntry("error", message, job.currentPlatformId);

  return prisma.catalogSyncJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: "failed" satisfies SyncAllJobStatus,
      finishedAt: new Date(),
      lastMessage: message,
      errorCount: {
        increment: 1,
      },
      recentErrors: pushSyncAllEntry(job.recentErrors, entry),
      recentLogs: pushSyncAllEntry(job.recentLogs, entry),
      lastHeartbeatAt: new Date(),
      ...clearSyncAllLeaseData(),
    },
  });
}

async function advanceSyncAllProvider(
  job: SyncAllJobRecord,
  message: string,
  level: SyncAllLogEntry["level"] = "info",
  runnerId?: string,
) {
  const entry = syncAllEntry(level, message, job.currentPlatformId);
  const nextPlatformIndex = job.platformIndex + 1;
  const isComplete = nextPlatformIndex >= CATALOG_PLATFORM_IDS.length;

  const updated = await prisma.catalogSyncJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: "running" satisfies SyncAllJobStatus,
      phase: isComplete
        ? ("audit-series" satisfies SyncAllJobPhase)
        : ("init-platform" satisfies SyncAllJobPhase),
      platformIndex: nextPlatformIndex,
      completedPlatforms: Math.min(nextPlatformIndex, CATALOG_PLATFORM_IDS.length),
      currentPlatformId: isComplete ? "" : CATALOG_PLATFORM_IDS[nextPlatformIndex],
      currentTabId: null,
      currentTabName: "",
      finishedAt: null,
      lastMessage: message,
      recentLogs: pushSyncAllEntry(job.recentLogs, entry),
      lastHeartbeatAt: new Date(),
      ...(level === "error"
        ? {
            errorCount: {
              increment: 1,
            },
            recentErrors: pushSyncAllEntry(job.recentErrors, entry),
          }
        : {}),
      ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
    },
  });

  return refreshSyncAllJobCounters(updated, runnerId);
}

async function markSeriesSyncFailed(seriesId: string, error: unknown) {
  await setSeriesHomepageVisibility(seriesId, false, "detail_sync_failed");

  await prisma.catalogSyncState.upsert({
    where: {
      seriesId,
    },
    create: {
      seriesId,
      scope: "series",
      status: "failed",
      hasMore: false,
      lastError: error instanceof Error ? error.message : "Hydrate detail failed.",
    },
    update: {
      status: "failed",
      hasMore: false,
      lastError: error instanceof Error ? error.message : "Hydrate detail failed.",
    },
  });
}

async function auditPendingSeriesDetailsForSyncAll(
  languageCode: string,
  limit = SYNC_ALL_DETAIL_BATCH_SIZE,
) {
  const pending = await prisma.catalogSeries.findMany({
    where: {
      language: {
        code: languageCode,
      },
      OR: [{ lastDetailSyncedAt: null }, { chapterCount: 0 }],
      NOT: {
        syncState: {
          is: {
            status: "failed",
          },
        },
      },
    },
    orderBy: [{ platformId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: Math.min(Math.max(limit, 1), 25),
    select: {
      id: true,
      title: true,
      platformId: true,
    },
  });

  const results: Array<{ hydrated: boolean; error?: SyncAllLogEntry }> = [];
  const concurrency = Math.min(
    Math.max(SYNC_ALL_DETAIL_CONCURRENCY, 1),
    pending.length || 1,
  );

  for (let index = 0; index < pending.length; index += concurrency) {
    const chunk = pending.slice(index, index + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        try {
          await hydrateSeriesDetail(item.id);
          return { hydrated: true };
        } catch (error) {
          await markSeriesSyncFailed(item.id, error);
          return {
            hydrated: false,
            error: syncAllEntry(
              "error",
              `${item.title}: ${
                error instanceof Error ? error.message : "Gagal hydrate detail."
              }`,
              item.platformId,
            ),
          };
        }
      }),
    );

    results.push(...chunkResults);
  }

  return {
    currentPlatformId: pending[0]?.platformId ?? "",
    hydrated: results.filter((item) => item.hydrated).length,
    attempted: pending.length,
    errors: results.flatMap((item) => (item.error ? [item.error] : [])),
  };
}

async function startSyncAllAuditPhase(
  job: SyncAllJobRecord,
  message: string,
  runnerId?: string,
) {
  const entry = syncAllEntry("info", message);
  const updated = await prisma.catalogSyncJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: "running" satisfies SyncAllJobStatus,
      phase: "audit-series" satisfies SyncAllJobPhase,
      completedPlatforms: job.totalPlatforms,
      currentPlatformId: "",
      currentTabId: null,
      currentTabName: "",
      lastMessage: message,
      recentLogs: pushSyncAllEntry(job.recentLogs, entry),
      ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
    },
  });

  return refreshSyncAllJobCounters(updated, runnerId);
}

async function processSyncAllInitPlatform(
  job: SyncAllJobRecord,
  runnerId?: string,
) {
  const platformId = CATALOG_PLATFORM_IDS[job.platformIndex];

  if (!platformId) {
    return advanceSyncAllProvider(job, "Sync all selesai.", "info", runnerId);
  }

  try {
    await ensureCatalogPlatformsRegistered();
    await syncPlatformLanguages(platformId, job.languageCode);
    const tabs = await syncTablist(platformId, job.languageCode);
    const message = `${CATALOG_PLATFORM_LABELS[platformId]} siap: ${tabs.length} tab ditemukan.`;
    const entry = syncAllEntry("info", message, platformId);
    const updated = await prisma.catalogSyncJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "running" satisfies SyncAllJobStatus,
        phase: "sync-tabs" satisfies SyncAllJobPhase,
        currentPlatformId: platformId,
        currentTabId: null,
        currentTabName: "",
        lastMessage: message,
        recentLogs: pushSyncAllEntry(job.recentLogs, entry),
        ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
      },
    });

    return refreshSyncAllJobCounters(updated, runnerId);
  } catch (error) {
    await hideProviderSeriesFromHomepage(
      platformId,
      job.languageCode,
      "provider_init_failed",
    );

    return advanceSyncAllProvider(
      {
        ...job,
        currentPlatformId: platformId,
      },
      `${CATALOG_PLATFORM_LABELS[platformId]} dilewati: ${
        error instanceof Error ? error.message : "Gagal init provider."
      }`,
      "error",
      runnerId,
    );
  }
}

async function processSyncAllTabPage(
  job: SyncAllJobRecord,
  runnerId?: string,
) {
  const platformId = CATALOG_PLATFORM_IDS[job.platformIndex];

  if (!platformId) {
    return advanceSyncAllProvider(job, "Sync all selesai.", "info", runnerId);
  }

  const { language } = await getCatalogPlatformWithLanguage(
    platformId,
    job.languageCode,
  );
  const pendingTab = await prisma.catalogTab.findFirst({
    where: {
      platformId,
      languageId: language.id,
      isActive: true,
      OR: [
        {
          syncState: {
            is: null,
          },
        },
        {
          syncState: {
            is: {
              status: "pending",
            },
          },
        },
      ],
    },
    orderBy: [{ positionIndex: "asc" }, { sortOrder: "asc" }],
  });
  const tabWithMore = pendingTab
    ? null
    : await prisma.catalogTab.findFirst({
        where: {
          platformId,
          languageId: language.id,
          isActive: true,
          syncState: {
            is: {
              status: "synced",
              hasMore: true,
            },
          },
        },
        orderBy: [{ positionIndex: "asc" }, { sortOrder: "asc" }],
      });
  const tab = pendingTab ?? tabWithMore;

  if (!tab) {
    if (job.platformIndex + 1 >= CATALOG_PLATFORM_IDS.length) {
      if (!SHOULD_AUDIT_AFTER_INDEX) {
        const entry = syncAllEntry(
          "info",
          "Index katalog selesai untuk semua provider. Audit massal dilewati; detail episode akan di-refresh saat dibuka.",
        );
        const updated = await prisma.catalogSyncJob.update({
          where: {
            id: job.id,
          },
          data: {
            status: "completed" satisfies SyncAllJobStatus,
            phase: "completed" satisfies SyncAllJobPhase,
            completedPlatforms: CATALOG_PLATFORM_IDS.length,
            currentPlatformId: "",
            currentTabId: null,
            currentTabName: "",
            finishedAt: new Date(),
            lastMessage:
              "Index katalog selesai. Detail episode memakai on-demand refresh.",
            recentLogs: pushSyncAllEntry(job.recentLogs, entry),
            ...clearSyncAllLeaseData(),
          },
        });

        return refreshSyncAllJobCounters(updated);
      }

      return startSyncAllAuditPhase(
        {
          ...job,
          completedPlatforms: CATALOG_PLATFORM_IDS.length,
        },
        "Index katalog selesai untuk semua provider. Audit episode dimulai.",
        runnerId,
      );
    }

    return advanceSyncAllProvider(
      {
        ...job,
        currentPlatformId: platformId,
      },
      `${CATALOG_PLATFORM_LABELS[platformId]} selesai index katalog, lanjut provider berikutnya.`,
      "info",
      runnerId,
    );
  }

  try {
    const result = pendingTab
      ? await syncTabFirstPage(tab.id)
      : await syncTabNextPage(tab.id);
    const message = `${CATALOG_PLATFORM_LABELS[platformId]} / ${tab.name}: ${result.syncedEntries} judul tersimpan.`;
    const entry = syncAllEntry("info", message, platformId);
    const updated = await prisma.catalogSyncJob.update({
      where: {
        id: job.id,
      },
      data: {
        currentPlatformId: platformId,
        currentTabId: tab.id,
        currentTabName: tab.name,
        lastMessage: message,
        recentLogs: pushSyncAllEntry(job.recentLogs, entry),
        ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
      },
    });

    return refreshSyncAllJobCounters(updated, runnerId);
  } catch (error) {
    await hideProviderSeriesFromHomepage(
      platformId,
      job.languageCode,
      "provider_tab_sync_failed",
    );

    const message = `${CATALOG_PLATFORM_LABELS[platformId]} / ${tab.name}: ${
      error instanceof Error ? error.message : "Gagal sync tab."
    }`;
    const entry = syncAllEntry("error", message, platformId);
    const updated = await prisma.catalogSyncJob.update({
      where: {
        id: job.id,
      },
      data: {
        currentPlatformId: platformId,
        currentTabId: tab.id,
        currentTabName: tab.name,
        lastMessage: message,
        errorCount: {
          increment: 1,
        },
        recentErrors: pushSyncAllEntry(job.recentErrors, entry),
        recentLogs: pushSyncAllEntry(job.recentLogs, entry),
        ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
      },
    });

    return refreshSyncAllJobCounters(updated, runnerId);
  }
}

async function processSyncAllAudit(
  job: SyncAllJobRecord,
  runnerId?: string,
) {
  const result = await auditPendingSeriesDetailsForSyncAll(job.languageCode);

  if (result.attempted === 0) {
    const entry = syncAllEntry("info", "Audit katalog selesai.");
    const updated = await prisma.catalogSyncJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "completed" satisfies SyncAllJobStatus,
        phase: "completed" satisfies SyncAllJobPhase,
        currentPlatformId: "",
        currentTabId: null,
        currentTabName: "",
        finishedAt: new Date(),
        lastMessage: "Audit katalog selesai.",
        recentLogs: pushSyncAllEntry(job.recentLogs, entry),
        ...clearSyncAllLeaseData(),
      },
    });

    return refreshSyncAllJobCounters(updated);
  }

  const platformId = result.currentPlatformId;
  const platformLabel =
    CATALOG_PLATFORM_LABELS[platformId as keyof typeof CATALOG_PLATFORM_LABELS] ??
    platformId;
  const message = `${platformLabel} audit ${result.hydrated}/${result.attempted} judul.`;
  const entry = syncAllEntry(
    result.errors.length > 0 ? "error" : "info",
    message,
    platformId,
  );
  const updated = await prisma.catalogSyncJob.update({
    where: {
      id: job.id,
    },
    data: {
      currentPlatformId: platformId,
      currentTabId: null,
      currentTabName: "",
      processedDetails: {
        increment: result.hydrated,
      },
      errorCount:
        result.errors.length > 0
          ? {
              increment: result.errors.length,
            }
          : undefined,
      recentErrors:
        result.errors.length > 0
          ? ([
              ...asSyncAllEntries(job.recentErrors),
              ...result.errors,
            ].slice(-12) as Prisma.InputJsonValue)
          : undefined,
      recentLogs: ([
        ...asSyncAllEntries(job.recentLogs),
        entry,
        ...result.errors,
      ].slice(-12) as Prisma.InputJsonValue),
      lastMessage: message,
      ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
    },
  });

  return refreshSyncAllJobCounters(updated, runnerId);
}

export async function runCatalogSyncAllStep(jobId?: string, runnerId?: string) {
  const activeJob = runnerId
    ? await claimCatalogSyncAllJobForRunner(runnerId, jobId)
    : await getSyncAllJobOrLatest(jobId);

  if (!activeJob) {
    return null;
  }

  if (!SYNC_ALL_RUNNING_STATUSES.includes(activeJob.status as "queued" | "running")) {
    return serializeSyncAllJob(activeJob);
  }

  const runningJob = await prisma.catalogSyncJob.update({
    where: {
      id: activeJob.id,
    },
    data: {
      status: "running" satisfies SyncAllJobStatus,
      startedAt: activeJob.startedAt ?? new Date(),
      ...(runnerId ? buildSyncAllLeaseData(runnerId) : {}),
    },
  });

  try {
    let nextJob;

    if (runningJob.phase === "init-platform") {
      nextJob = await processSyncAllInitPlatform(runningJob, runnerId);
    } else if (runningJob.phase === "sync-tabs") {
      nextJob = await processSyncAllTabPage(runningJob, runnerId);
    } else if (runningJob.phase === "audit-series") {
      nextJob = await processSyncAllAudit(runningJob, runnerId);
    } else {
      nextJob = runningJob;
    }

    return serializeSyncAllJob(nextJob);
  } catch (error) {
    return serializeSyncAllJob(await markSyncAllJobFailed(runningJob, error));
  }
}

async function getCatalogSeriesWithEpisodes(seriesId: string) {
  return prisma.catalogSeries.findUnique({
    where: { id: seriesId },
    include: {
      episodes: {
        orderBy: {
          episodeIndex: "asc",
        },
      },
    },
  });
}

export async function ensureSeriesPlayableFresh(
  seriesId: string,
  options?: {
    allowStaleOnFailure?: boolean;
    force?: boolean;
    hideOnFailure?: boolean;
  },
) {
  const series = await getCatalogSeriesWithEpisodes(seriesId);

  if (!series) {
    return null;
  }

  const shouldRefresh =
    options?.force ||
    series.episodes.length === 0 ||
    series.chapterCount === 0 ||
    isSeriesDetailStale(series.lastDetailSyncedAt);

  if (!shouldRefresh) {
    return series;
  }

  try {
    return await hydrateSeriesDetail(seriesId);
  } catch (error) {
    if (options?.hideOnFailure) {
      await setSeriesHomepageVisibility(
        seriesId,
        false,
        HOMEPAGE_HIDDEN_REASON_ON_DEMAND_FAILED,
      );

      await prisma.catalogSyncState.upsert({
        where: { seriesId },
        create: {
          seriesId,
          scope: "series",
          status: "failed",
          hasMore: false,
          lastError:
            error instanceof Error
              ? error.message
              : "On-demand detail refresh failed.",
        },
        update: {
          status: "failed",
          hasMore: false,
          lastError:
            error instanceof Error
              ? error.message
              : "On-demand detail refresh failed.",
        },
      });
    }

    if (options?.allowStaleOnFailure && series.episodes.length > 0) {
      return series;
    }

    return null;
  }
}

export async function ensureSeriesHydrated(seriesId: string) {
  try {
    return await ensureSeriesPlayableFresh(seriesId, {
      allowStaleOnFailure: true,
    });
  } catch {
    const series = await getCatalogSeriesWithEpisodes(seriesId);
    return series;
  }
}

export async function searchCatalog(keyword: string) {
  const query = keyword.trim();

  if (query.length < 2) {
    return [];
  }

  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  if (terms.length === 0) {
    return [];
  }

  return prisma.catalogSeries.findMany({
    where: {
      isHomepageVisible: true,
      AND: terms.map((term) => ({
        OR: [
          {
            title: {
              contains: term,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: term,
              mode: "insensitive",
            },
          },
          {
            tags: {
              has: term,
            },
          },
        ],
      })),
    },
    include: {
      platform: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 24,
  });
}

export async function importSearchResults(keyword: string) {
  const { platform, language } = await getCatalogPlatformWithLanguage();
  const payload = await fetchPlatformSearch(keyword, platform.id, language.code);

  return upsertCatalogSeriesSummaries({
    platformId: platform.id,
    languageId: language.id,
    entries: payload.entries,
  });
}

export async function getHomeCatalogData() {
  const initialFeed = await getCatalogFeedPage(0, DEFAULT_HOME_PAGE_SIZE);

  const [episodeCount, totalSeries] = await Promise.all([
    prisma.catalogEpisode.count({
      where: {
        series: {
          isHomepageVisible: true,
          platform: {
            isHomepageVisible: true,
          },
        },
      },
    }),
    prisma.catalogSeries.count({
      where: {
        isHomepageVisible: true,
        platform: {
          isHomepageVisible: true,
        },
      },
    }),
  ]);

  return {
    initialFeed,
    stats: {
      totalSeries,
      totalEpisodes: episodeCount,
    },
  };
}

export async function getCatalogFeedPage(
  offset = 0,
  limit = DEFAULT_HOME_PAGE_SIZE,
) {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), 30);

  const [seriesEntries, total] = await Promise.all([
    prisma.catalogSeries.findMany({
      where: {
        isHomepageVisible: true,
        platform: {
          isHomepageVisible: true,
        },
      },
      include: {
        platform: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { title: "asc" }],
      skip: safeOffset,
      take: safeLimit,
    }),
    prisma.catalogSeries.count({
      where: {
        isHomepageVisible: true,
        platform: {
          isHomepageVisible: true,
        },
      },
    }),
  ]);

  return {
    entries: seriesEntries.map((series) => toCatalogSeriesCard(series)),
    total,
    nextOffset: safeOffset + seriesEntries.length,
    hasMore: safeOffset + seriesEntries.length < total,
  };
}

export async function getCatalogShortcuts() {
  const tags = await prisma.$queryRaw<Array<{ tag: string; count: number }>>(Prisma.sql`
    SELECT tag, COUNT(*)::int AS count
    FROM (
      SELECT UNNEST(tags) AS tag
      FROM "CatalogSeries" s
      JOIN "CatalogPlatform" p ON p."id" = s."platformId"
      WHERE s."isHomepageVisible" = true
        AND p."isHomepageVisible" = true
    ) AS tags_expanded
    WHERE tag <> ''
    GROUP BY tag
    ORDER BY COUNT(*) DESC, tag ASC
    LIMIT 16
  `);

  const tabTypes = await prisma.catalogTab.groupBy({
    by: ["type"],
    _count: {
      _all: true,
    },
    orderBy: {
      type: "asc",
    },
  });

  return {
    filters: tabTypes.map((item) => ({
      value: item.type,
      count: item._count._all,
    })),
    tags: tags.map((item) => ({
      value: item.tag,
      count: Number(item.count),
    })),
  };
}

export async function getCatalogSyncDashboard() {
  return getCatalogSyncDashboardForPlatform(
    DEFAULT_CATALOG_PLATFORM,
    DEFAULT_CATALOG_LANGUAGE,
  );
}

export async function getCatalogSyncDashboardForPlatform(
  platformId = DEFAULT_CATALOG_PLATFORM,
  languageCode = DEFAULT_CATALOG_LANGUAGE,
) {
  const { platform, language } = await getCatalogPlatformWithLanguage(
    platformId,
    languageCode,
  );
  const [
    platforms,
    languages,
    tabs,
    seriesCount,
    episodeCount,
    pendingDetailCount,
    platformSeriesGroups,
    platformLanguageGroups,
    platformTabGroups,
    platformEpisodeGroups,
  ] =
    await Promise.all([
      prisma.catalogPlatform.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.catalogLanguage.findMany({
        where: {
          platformId: platform.id,
          isActive: true,
        },
        orderBy: [{ isDefault: "desc" }, { code: "asc" }],
      }),
      prisma.catalogTab.findMany({
        where: {
          platformId: platform.id,
          languageId: language.id,
        },
        include: {
          syncState: true,
          _count: {
            select: {
              memberships: true,
            },
          },
        },
        orderBy: [{ positionIndex: "asc" }, { sortOrder: "asc" }],
      }),
      prisma.catalogSeries.count({
        where: {
          platformId: platform.id,
          languageId: language.id,
        },
      }),
      prisma.catalogEpisode.count({
        where: {
          series: {
            platformId: platform.id,
            languageId: language.id,
          },
        },
      }),
      prisma.catalogSeries.count({
        where: {
          platformId: platform.id,
          languageId: language.id,
          OR: [{ lastDetailSyncedAt: null }, { chapterCount: 0 }],
        },
      }),
      prisma.catalogSeries.groupBy({
        by: ["platformId"],
        _count: {
          _all: true,
        },
      }),
      prisma.catalogLanguage.groupBy({
        by: ["platformId"],
        where: {
          isActive: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.catalogTab.groupBy({
        by: ["platformId"],
        where: {
          isActive: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.catalogEpisode.groupBy({
        by: ["seriesId"],
        _count: {
          _all: true,
        },
      }),
    ]);

  const seriesCountByPlatform = new Map(
    platformSeriesGroups.map((item) => [item.platformId, item._count._all]),
  );
  const languageCountByPlatform = new Map(
    platformLanguageGroups.map((item) => [item.platformId, item._count._all]),
  );
  const tabCountByPlatform = new Map(
    platformTabGroups.map((item) => [item.platformId, item._count._all]),
  );
  const seriesPlatformMap = new Map(
    (
      await prisma.catalogSeries.findMany({
        select: {
          id: true,
          platformId: true,
        },
      })
    ).map((item) => [item.id, item.platformId]),
  );
  const episodeCountByPlatform = new Map<string, number>();

  for (const item of platformEpisodeGroups) {
    const seriesPlatformId = seriesPlatformMap.get(item.seriesId);

    if (!seriesPlatformId) {
      continue;
    }

    episodeCountByPlatform.set(
      seriesPlatformId,
      (episodeCountByPlatform.get(seriesPlatformId) ?? 0) + item._count._all,
    );
  }
  const syncJob = await getLatestCatalogSyncAllJob();

  return {
    platform,
    language,
    syncJob,
    platforms: platforms.map((item) => ({
      id: item.id,
      name: item.name,
      isDefault: item.id === DEFAULT_CATALOG_PLATFORM,
    })),
    languages: languages.map((item) => ({
      id: item.id,
      code: item.code,
      isDefault: item.isDefault,
    })),
    providerSummaries: platforms.map((item) => ({
      id: item.id,
      name: item.name,
      isCurrent: item.id === platform.id,
      isHomepageVisible: item.isHomepageVisible,
      languageCount: languageCountByPlatform.get(item.id) ?? 0,
      tabCount: tabCountByPlatform.get(item.id) ?? 0,
      titleCount: seriesCountByPlatform.get(item.id) ?? 0,
      episodeCount: episodeCountByPlatform.get(item.id) ?? 0,
    })),
    stats: {
      tabCount: tabs.length,
      seriesCount,
      episodeCount,
      tabsWithMorePages: tabs.filter((tab) => tab.syncState?.hasMore).length,
      pendingDetailCount,
    },
    tabs: tabs.map((tab) => ({
      id: tab.id,
      type: tab.type,
      name: tab.name,
      positionIndex: tab.positionIndex,
      sortOrder: tab.sortOrder,
      storedSeriesCount: tab._count.memberships,
      syncStatus: tab.syncState?.status ?? "pending",
      hasMore: tab.syncState?.hasMore ?? false,
      lastSyncedAt: tab.syncState?.lastSyncedAt?.toISOString() ?? null,
      lastError: tab.syncState?.lastError ?? "",
    })),
  };
}

export async function setCatalogPlatformHomepageVisibility(
  platformId: string,
  isHomepageVisible: boolean,
) {
  const platform = await prisma.catalogPlatform.update({
    where: {
      id: platformId,
    },
    data: {
      isHomepageVisible,
    },
  });

  return {
    id: platform.id,
    isHomepageVisible: platform.isHomepageVisible,
  };
}
