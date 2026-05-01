import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogStorageSection, defaultCatalogParams, getProviderCatalogSection } from "@/lib/streamapi/catalog-sections";
import { ProviderEmptyDramaPayloadError } from "@/lib/streamapi/adapters";
import { normalizePlayback } from "@/lib/streamapi/normalizers";
import { getAllProviders, getProvider, PROVIDERS } from "@/lib/streamapi/registry";
import type {
  CatalogParamDefinition,
  CatalogSectionDefinition,
  CanonicalDrama,
  CanonicalEpisode,
  CanonicalPlayback,
  JsonRecord,
  JsonValue,
  ProviderCode
} from "@/lib/streamapi/types";

export const STREAMAPI_SOURCE = "streamapi";
const LEGACY_HIDDEN_REASON = "legacy_catalog_hidden";
const MISSING_COVER_HIDDEN_REASON = "missing_provider_cover";
const PLAYBACK_REFRESH_GRACE_MS = 120_000;

export type ProviderSyncDashboard = {
  providers: Array<{
    code: ProviderCode;
    name: string;
    enabled: boolean;
    dramaCount: number;
    episodeCount: number;
    sections: CatalogSectionDefinition[];
  }>;
  jobs: Array<{
    id: string;
    type: string;
    providerCode: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    lastError: string;
    createdAt: string;
    updatedAt: string;
    payload: JsonRecord;
  }>;
  logs: Array<{
    id: string;
    workerId: string | null;
    jobId: string | null;
    level: string;
    message: string;
    meta: JsonRecord;
    createdAt: string;
  }>;
};

type ProviderSyncJobRow = {
  id: string;
  type: string;
  providerCode: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
};

export function isStreamApiProviderCode(value: string): value is ProviderCode {
  return (PROVIDERS as readonly string[]).includes(value);
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function jsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function stringPayload(payload: JsonRecord, key: string, fallback: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberPayload(payload: JsonRecord, key: string, fallback: number) {
  const value = payload[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function sanitizeNumberParam(param: CatalogParamDefinition, value: unknown) {
  const fallback =
    typeof param.defaultValue === "number"
      ? param.defaultValue
      : Number(param.defaultValue ?? 0);
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : fallback;
  const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  const min = typeof param.min === "number" ? param.min : Number.NEGATIVE_INFINITY;
  const max = typeof param.max === "number" ? param.max : Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, normalized));
}

function sanitizeTextParam(param: CatalogParamDefinition, value: unknown) {
  const fallback = String(param.defaultValue ?? "");
  const nextValue =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : fallback;

  if (param.required && !nextValue) {
    throw new Error(`${param.label} wajib diisi.`);
  }

  return nextValue;
}

export function validateProviderEndpointInput(input: {
  provider: string;
  section: string;
  page?: unknown;
  params?: unknown;
  lang?: string;
}) {
  const provider = input.provider.trim();

  if (!isStreamApiProviderCode(provider)) {
    throw new Error(`Provider ${provider || "-"} tidak terdaftar.`);
  }

  const section = getProviderCatalogSection(provider, input.section.trim());

  if (!section) {
    throw new Error(`Endpoint ${input.section || "-"} tidak tersedia untuk provider ${provider}.`);
  }

  const rawParams = jsonRecord(input.params);
  const params: JsonRecord = {};

  for (const param of section.params) {
    const rawValue = rawParams[param.name];

    if (param.type === "fixed") {
      if (param.defaultValue !== undefined) {
        params[param.name] = param.defaultValue as JsonValue;
      }
      continue;
    }

    if (param.name === "page") {
      continue;
    }

    if (param.type === "number") {
      params[param.name] = sanitizeNumberParam(param, rawValue) as JsonValue;
      continue;
    }

    if (param.type === "select") {
      const value = sanitizeTextParam(param, rawValue);
      const allowedValues = new Set((param.options ?? []).map((option) => option.value));
      if (allowedValues.size > 0 && !allowedValues.has(value)) {
        throw new Error(`${param.label} tidak valid.`);
      }
      params[param.name] = value;
      continue;
    }

    params[param.name] = sanitizeTextParam(param, rawValue);
  }

  const pageParamDefinition = section.params.find((param) => param.name === "page");
  const page = section.supportsPage
    ? sanitizeNumberParam(
        pageParamDefinition ?? {
          name: "page",
          label: "Page",
          type: "number",
          required: true,
          defaultValue: section.defaultPage,
          min: 0,
          help: "Halaman upstream.",
        },
        input.page ?? rawParams.page ?? section.defaultPage,
      )
    : section.defaultPage;

  if (section.supportsPage) {
    params.page = page as JsonValue;
  }

  return {
    provider,
    section,
    page,
    lang: input.lang?.trim() || "id",
    params,
  };
}

function streamApiLanguage(provider: ProviderCode, lang = "id") {
  return getProvider(provider).mapLang(lang);
}

function playbackExpiresAt(playback: CanonicalPlayback) {
  if (!playback.expiresAt) return null;
  const date = new Date(playback.expiresAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCachedPlaybackFresh(episode: {
  playbackSources: Prisma.JsonValue | null;
  playbackExpiresAt: Date | null;
}) {
  const sources = Array.isArray(episode.playbackSources) ? episode.playbackSources : [];
  if (!sources.length) return false;
  if (sources.some(isUnpreparedTencentVodSource)) return false;
  if (!episode.playbackExpiresAt) return true;
  return episode.playbackExpiresAt.getTime() > Date.now() + PLAYBACK_REFRESH_GRACE_MS;
}

function isUnpreparedTencentVodSource(source: unknown) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return false;
  }

  const url = (source as { url?: unknown }).url;
  return (
    typeof url === "string" &&
    url.includes(".m3u8") &&
    url.includes(".jowo.tv/") &&
    !url.includes("/voddrm.token.")
  );
}

function playbackFromEpisodeRaw(provider: ProviderCode, episode: CanonicalEpisode) {
  return normalizePlayback(episode.rawPayload, provider, episode.id, episode.rawPayload);
}

function episodeVideoUrl(playback: CanonicalPlayback) {
  return playback.sources[0]?.url ?? "";
}

function episodeChecksum(episode: CanonicalEpisode, playback: CanonicalPlayback) {
  return `${episode.episodeNumber}:${episode.externalId}:${episodeVideoUrl(playback)}`;
}

function fallbackDramaFromSeries(series: {
  id: string;
  platformId: string;
  upstreamSeriesId: string;
  title: string;
  description: string;
  coverUrl: string;
  chapterCount: number;
  tags: string[];
  providerRawPayload: Prisma.JsonValue | null;
}, lang: string): CanonicalDrama {
  return {
    id: series.id,
    provider: series.platformId as ProviderCode,
    externalId: series.upstreamSeriesId,
    lang,
    title: series.title,
    description: series.description || null,
    posterUrl: series.coverUrl || null,
    tags: series.tags,
    episodeCount: series.chapterCount || null,
    status: "unknown",
    rawPayload: jsonRecord(series.providerRawPayload)
  };
}

async function ensureStreamApiPlatform(provider: ProviderCode) {
  const adapter = getProvider(provider);
  const [platform, language] = await prisma.$transaction(async (tx) => {
    const platformRecord = await tx.catalogPlatform.upsert({
      where: { id: provider },
      create: {
        id: provider,
        name: adapter.name,
        isActive: true,
        isHomepageVisible: true
      },
      update: {
        name: adapter.name,
        isActive: true,
        isHomepageVisible: true
      }
    });

    const languageRecord = await tx.catalogLanguage.upsert({
      where: {
        platformId_code: {
          platformId: provider,
          code: "id"
        }
      },
      create: {
        platformId: provider,
        code: "id",
        upstreamCode: streamApiLanguage(provider, "id"),
        isDefault: true,
        isActive: true
      },
      update: {
        upstreamCode: streamApiLanguage(provider, "id"),
        isDefault: true,
        isActive: true
      }
    });

    return [platformRecord, languageRecord] as const;
  });

  return { platform, language };
}

export async function initializeStreamApiCatalog() {
  await Promise.all(PROVIDERS.map((provider) => ensureStreamApiPlatform(provider)));
  await prisma.catalogSeries.updateMany({
    where: {
      catalogSource: { not: STREAMAPI_SOURCE }
    },
    data: {
      isHomepageVisible: false,
      homepageHiddenReason: LEGACY_HIDDEN_REASON
    }
  });
}

async function upsertSeries(provider: ProviderCode, languageId: string, drama: CanonicalDrama) {
  const coverUrl = drama.posterUrl?.trim() ?? "";
  const description = drama.description?.trim() ?? "";
  const episodeCount = drama.episodeCount ?? 0;
  const existing = await prisma.catalogSeries.findUnique({
    where: {
      platformId_languageId_upstreamSeriesId: {
        platformId: provider,
        languageId,
        upstreamSeriesId: drama.externalId
      }
    },
    select: {
      title: true,
      chapterCount: true,
      tags: true
    }
  });
  const isFallbackTitle = drama.title === `Untitled ${drama.externalId}`;
  const shouldUpdateTitle = !isFallbackTitle || !existing || existing.title.startsWith("Untitled ");
  const shouldUpdateEpisodeCount = episodeCount > Math.max(existing?.chapterCount ?? 0, 0);
  const shouldUpdateTags = drama.tags.length > 0 || !existing?.tags.length;

  const series = await prisma.catalogSeries.upsert({
    where: {
      platformId_languageId_upstreamSeriesId: {
        platformId: provider,
        languageId,
        upstreamSeriesId: drama.externalId
      }
    },
    create: {
      platformId: provider,
      languageId,
      upstreamSeriesId: drama.externalId,
      title: drama.title,
      description,
      coverUrl,
      chapterCount: episodeCount,
      playCount: "",
      tags: drama.tags,
      catalogSource: STREAMAPI_SOURCE,
      providerRawPayload: json(drama.rawPayload),
      isHomepageVisible: Boolean(coverUrl),
      homepageHiddenReason: coverUrl ? null : MISSING_COVER_HIDDEN_REASON
    },
    update: {
      ...(shouldUpdateTitle ? { title: drama.title } : {}),
      ...(description ? { description } : {}),
      ...(coverUrl ? { coverUrl, isHomepageVisible: true, homepageHiddenReason: null } : {}),
      ...(shouldUpdateEpisodeCount ? { chapterCount: episodeCount } : {}),
      ...(shouldUpdateTags ? { tags: drama.tags } : {}),
      catalogSource: STREAMAPI_SOURCE,
      providerRawPayload: json(drama.rawPayload),
    }
  });

  if (!coverUrl) {
    await prisma.catalogSeries.updateMany({
      where: {
        id: series.id,
        coverUrl: ""
      },
      data: {
        isHomepageVisible: false,
        homepageHiddenReason: MISSING_COVER_HIDDEN_REASON
      }
    });
  }

  return series;
}

async function upsertEpisodes(seriesId: string, provider: ProviderCode, episodes: CanonicalEpisode[]) {
  for (const episode of episodes) {
    const playback = playbackFromEpisodeRaw(provider, episode);
    await prisma.catalogEpisode.upsert({
      where: {
        seriesId_episodeIndex: {
          seriesId,
          episodeIndex: episode.episodeNumber
        }
      },
      create: {
        seriesId,
        episodeIndex: episode.episodeNumber,
        episodeLabel: episode.title ?? `EP-${episode.episodeNumber}`,
        videoUrl: episodeVideoUrl(playback),
        quality: null,
        subtitles: json(playback.subtitles),
        upstreamEpisodeId: episode.externalId,
        isLocked: episode.isLocked || playback.status === "locked",
        sourceType: playback.sourceType,
        playbackSources: json(playback.sources),
        playbackSubtitles: json(playback.subtitles),
        playbackExpiresAt: playbackExpiresAt(playback),
        providerRawPayload: json(episode.rawPayload),
        checksum: episodeChecksum(episode, playback)
      },
      update: {
        episodeLabel: episode.title ?? `EP-${episode.episodeNumber}`,
        videoUrl: episodeVideoUrl(playback),
        subtitles: json(playback.subtitles),
        upstreamEpisodeId: episode.externalId,
        isLocked: episode.isLocked || playback.status === "locked",
        sourceType: playback.sourceType,
        playbackSources: json(playback.sources),
        playbackSubtitles: json(playback.subtitles),
        playbackExpiresAt: playbackExpiresAt(playback),
        providerRawPayload: json(episode.rawPayload),
        checksum: episodeChecksum(episode, playback)
      }
    });
  }
}

export async function syncProviderCatalog(provider: ProviderCode, section: string, page: number, params: JsonRecord = {}, lang = "id") {
  const { language } = await ensureStreamApiPlatform(provider);
  const adapter = getProvider(provider);
  const result = await adapter.listCatalog({ provider, section, page, lang, params });

  for (const drama of result.items) {
    await upsertSeries(provider, language.id, drama);
    await enqueueProviderSyncJob("detail", provider, {
      externalId: drama.externalId,
      lang
    }, 45);
  }

  await logProviderWorker({
    level: "info",
    message: `Synced ${result.items.length} catalog items from ${provider}/${catalogStorageSection(section, params)} page ${page}.`,
    meta: { provider, section, page, params }
  });

  return result.items.length;
}

export async function syncProviderDetail(provider: ProviderCode, externalId: string, lang = "id") {
  const { language } = await ensureStreamApiPlatform(provider);
  const existing = await prisma.catalogSeries.findUnique({
    where: {
      platformId_languageId_upstreamSeriesId: {
        platformId: provider,
        languageId: language.id,
        upstreamSeriesId: externalId
      }
    },
    select: {
      id: true,
      platformId: true,
      upstreamSeriesId: true,
      title: true,
      description: true,
      coverUrl: true,
      chapterCount: true,
      tags: true,
      providerRawPayload: true
    }
  });
  const adapter = getProvider(provider);

  let drama: CanonicalDrama;
  try {
    drama = await adapter.getDrama({ provider, externalId, lang });
  } catch (error) {
    if (existing && (error instanceof ProviderEmptyDramaPayloadError || error instanceof Error)) {
      drama = fallbackDramaFromSeries(existing, lang);
    } else {
      throw error;
    }
  }

  const series = await upsertSeries(provider, language.id, drama);
  const episodes = await adapter.getEpisodes({ provider, externalId, lang });
  await upsertEpisodes(series.id, provider, episodes);
  await prisma.catalogSeries.update({
    where: { id: series.id },
    data: {
      chapterCount: Math.max(drama.episodeCount ?? 0, episodes.length, series.chapterCount),
      lastDetailSyncedAt: new Date()
    }
  });

  return { seriesId: series.id, episodeCount: episodes.length };
}

export async function resolveProviderPlayback(input: {
  seriesId: string;
  episodeIndex: number;
  quality?: string;
}) {
  const episode = await prisma.catalogEpisode.findUnique({
    where: {
      seriesId_episodeIndex: {
        seriesId: input.seriesId,
        episodeIndex: input.episodeIndex
      }
    },
    include: {
      series: {
        include: {
          language: true
        }
      }
    }
  });

  if (!episode || episode.series.catalogSource !== STREAMAPI_SOURCE || !isStreamApiProviderCode(episode.series.platformId)) {
    return null;
  }

  if (isCachedPlaybackFresh(episode)) {
    const sources = Array.isArray(episode.playbackSources)
      ? episode.playbackSources
      : [];
    return {
      provider: episode.series.platformId,
      status: episode.isLocked ? "locked" : sources.length > 0 ? "ready" : "unavailable",
      sources,
      subtitles: Array.isArray(episode.playbackSubtitles)
        ? episode.playbackSubtitles
        : Array.isArray(episode.subtitles)
          ? episode.subtitles
          : [],
      sourceType: episode.sourceType,
      expiresAt: episode.playbackExpiresAt
    };
  }

  const provider = episode.series.platformId;
  const adapter = getProvider(provider);
  const playback = await adapter.resolvePlayback({
    provider,
    externalId: episode.series.upstreamSeriesId,
    lang: episode.series.language.code,
    episodeId: episode.id,
    episodeExternalId: episode.upstreamEpisodeId ?? String(episode.episodeIndex),
    episodeNumber: episode.episodeIndex,
    quality: input.quality,
    rawEpisode: jsonRecord(episode.providerRawPayload)
  });

  await prisma.catalogEpisode.update({
    where: { id: episode.id },
    data: {
      videoUrl: episodeVideoUrl(playback),
      sourceType: playback.sourceType,
      playbackSources: json(playback.sources),
      playbackSubtitles: json(playback.subtitles),
      playbackExpiresAt: playbackExpiresAt(playback),
      subtitles: json(playback.subtitles),
      isLocked: playback.status === "locked" || episode.isLocked
    }
  });

  return {
    provider,
    status: playback.status,
    sources: playback.sources,
    subtitles: playback.subtitles,
    sourceType: playback.sourceType,
    expiresAt: playbackExpiresAt(playback)
  };
}

export async function enqueueProviderSyncJob(type: "catalog" | "detail", provider: ProviderCode, payload: JsonRecord, priority = 50) {
  const active = await prisma.providerSyncJob.findFirst({
    where: {
      type,
      providerCode: provider,
      status: { in: ["queued", "processing"] },
      payload: { equals: json(payload) }
    }
  });

  if (active) return active;

  return prisma.providerSyncJob.create({
    data: {
      type,
      providerCode: provider,
      payload: json(payload),
      priority
    }
  });
}

export async function enqueueProviderEndpointSync(provider: ProviderCode, section: string, page: number, params: JsonRecord = {}, lang = "id") {
  return enqueueProviderSyncJob("catalog", provider, { section, page, params, lang }, 80);
}

export async function claimProviderSyncJob(workerId: string) {
  const rows = await prisma.$queryRaw<ProviderSyncJobRow[]>`
    update "ProviderSyncJob"
    set
      "status" = 'processing',
      "workerId" = ${workerId},
      "attempts" = "attempts" + 1,
      "startedAt" = now(),
      "updatedAt" = now()
    where "id" = (
      select "id"
      from "ProviderSyncJob"
      where "status" = 'queued'
        and "scheduledAt" <= now()
      order by "priority" desc, "scheduledAt" asc, "createdAt" asc
      for update skip locked
      limit 1
    )
    returning "id", "type", "providerCode", "payload", "attempts", "maxAttempts"
  `;

  return rows[0] ?? null;
}

export async function processProviderSyncJob(job: ProviderSyncJobRow, workerId: string) {
  if (!isStreamApiProviderCode(job.providerCode)) {
    throw new Error(`Provider ${job.providerCode} is not registered.`);
  }

  const provider = job.providerCode;
  const payload = jsonRecord(job.payload);

  await logProviderWorker({
    workerId,
    jobId: job.id,
    level: "info",
    message: `Processing ${job.type} ${provider}.`,
    meta: payload
  });

  if (job.type === "catalog") {
    const section = stringPayload(payload, "section", getProvider(provider).defaultSection);
    const sectionDef = getProviderCatalogSection(provider, section) ?? getProvider(provider).catalogSections[0];
    const params = jsonRecord(payload.params);
    const page = numberPayload(payload, "page", sectionDef?.defaultPage ?? 1);
    const lang = stringPayload(payload, "lang", "id");
    const safeParams = Object.keys(params).length ? params : sectionDef ? defaultCatalogParams(sectionDef) : {};
    if (sectionDef?.supportsPage) safeParams.page = page as JsonValue;
    return syncProviderCatalog(provider, section, page, safeParams, lang);
  }

  if (job.type === "detail") {
    const externalId = stringPayload(payload, "externalId", "");
    if (!externalId) throw new Error("externalId is required.");
    return syncProviderDetail(provider, externalId, stringPayload(payload, "lang", "id"));
  }

  throw new Error(`Unsupported provider sync job type ${job.type}.`);
}

export async function completeProviderSyncJob(jobId: string) {
  await prisma.providerSyncJob.update({
    where: { id: jobId },
    data: {
      status: "done",
      finishedAt: new Date(),
      updatedAt: new Date()
    }
  });
}

export async function failProviderSyncJob(job: ProviderSyncJobRow, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected provider sync failure.";
  const retry = job.attempts < job.maxAttempts;
  await prisma.providerSyncJob.update({
    where: { id: job.id },
    data: {
      status: retry ? "queued" : "failed",
      lastError: message,
      scheduledAt: retry ? new Date(Date.now() + Math.min(300_000, job.attempts * 30_000)) : new Date(),
      finishedAt: retry ? null : new Date(),
      updatedAt: new Date()
    }
  });
}

export async function logProviderWorker(input: {
  workerId?: string;
  jobId?: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: JsonRecord;
}) {
  await prisma.providerWorkerLog.create({
    data: {
      workerId: input.workerId,
      jobId: input.jobId,
      level: input.level,
      message: input.message,
      meta: json(input.meta ?? {})
    }
  });
}

export async function getProviderSyncDashboard(): Promise<ProviderSyncDashboard> {
  const [seriesCounts, episodeCounts, jobs, logs] = await Promise.all([
    prisma.catalogSeries.groupBy({
      by: ["platformId"],
      where: { catalogSource: STREAMAPI_SOURCE },
      _count: { _all: true }
    }),
    prisma.catalogEpisode.groupBy({
      by: ["seriesId"],
      where: {
        series: { catalogSource: STREAMAPI_SOURCE }
      },
      _count: { _all: true }
    }),
    prisma.providerSyncJob.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 30
    }),
    prisma.providerWorkerLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 80
    })
  ]);

  const seriesCountByProvider = new Map(seriesCounts.map((row) => [row.platformId, row._count._all]));
  const episodeCountBySeries = new Map(episodeCounts.map((row) => [row.seriesId, row._count._all]));
  const streamSeries = await prisma.catalogSeries.findMany({
    where: { catalogSource: STREAMAPI_SOURCE },
    select: { id: true, platformId: true }
  });
  const episodeCountByProvider = new Map<string, number>();
  for (const series of streamSeries) {
    episodeCountByProvider.set(series.platformId, (episodeCountByProvider.get(series.platformId) ?? 0) + (episodeCountBySeries.get(series.id) ?? 0));
  }

  return {
    providers: getAllProviders().map((adapter) => ({
      code: adapter.code,
      name: adapter.name,
      enabled: true,
      dramaCount: seriesCountByProvider.get(adapter.code) ?? 0,
      episodeCount: episodeCountByProvider.get(adapter.code) ?? 0,
      sections: adapter.catalogSections
    })),
    jobs: jobs.map((job) => ({
      id: job.id,
      type: job.type,
      providerCode: job.providerCode,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: job.lastError,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      payload: jsonRecord(job.payload)
    })),
    logs: logs.map((log) => ({
      id: log.id,
      workerId: log.workerId,
      jobId: log.jobId,
      level: log.level,
      message: log.message,
      meta: jsonRecord(log.meta),
      createdAt: log.createdAt.toISOString()
    }))
  };
}
