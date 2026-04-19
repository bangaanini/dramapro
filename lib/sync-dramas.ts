import { prisma } from "@/lib/prisma";
import {
  ACTIVE_PROVIDERS,
  getProviderPayloadError,
  normalizeStreamPayload,
  ProviderType,
  ProviderDetailMetadata,
  SyncSource,
  UpstreamHttpError,
  fetchProviderJson,
  normalizeCollectionPayload,
  normalizeDetailMetadata,
  resolveStreamRequest,
} from "@/lib/provider-adapter";

export type SyncError = {
  providerDramaId: string | null;
  message: string;
};

export type ProviderSyncResult = {
  provider: ProviderType;
  source: SyncSource;
  page: number;
  processed: number;
  created: number;
  updated: number;
  hidden: number;
  skipped: number;
  errors: SyncError[];
};

export type BatchSyncResult = {
  startedAt: string;
  finishedAt: string;
  providers: ProviderSyncResult[];
  totals: {
    processed: number;
    created: number;
    updated: number;
    hidden: number;
    skipped: number;
    errors: number;
  };
};

export type StoredDramaStreamAuditError = {
  dramaId: string;
  provider: ProviderType;
  providerDramaId: string;
  title: string;
  message: string;
  status: "hidden";
};

export type StoredDramaStreamAuditResult = {
  source: SyncSource;
  total: number;
  checked: number;
  playable: number;
  hidden: number;
  restored: number;
  alreadyHidden: number;
  errors: StoredDramaStreamAuditError[];
  providerSummary: Array<{
    provider: ProviderType;
    total: number;
    playable: number;
    hidden: number;
    restored: number;
    alreadyHidden: number;
    errors: number;
  }>;
};

export type StoredDramaStreamAuditBatchResult = StoredDramaStreamAuditResult & {
  batchSize: number;
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
};

const STREAM_VALIDATION_PROVIDERS = new Set<ProviderType>(ACTIVE_PROVIDERS);
const FAST_METADATA_SYNC_PROVIDERS = new Set<ProviderType>(["dramadash"]);

type StreamValidationResult =
  | { ok: true }
  | { ok: false; message: string };

async function fetchCollectionPayloadWithRetry(
  provider: ProviderType,
  source: SyncSource,
  page: number,
) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      return await fetchProviderJson(source, provider, {
        page,
      });
    } catch (error) {
      attempts += 1;
      const shouldRetryNetworkError =
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.toLowerCase().includes("fetch failed") ||
          error.message.toLowerCase().includes("timed out"));

      if (
        attempts < maxAttempts &&
        ((error instanceof UpstreamHttpError &&
          (error.status === 403 || error.status === 429 || error.status >= 500)) ||
          shouldRetryNetworkError)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempts));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Collection fetch retry loop exhausted.");
}

async function enrichDramaMetadata(
  drama: {
    providerDramaId: string;
    providerName: ProviderType;
    title: string;
    description: string;
    thumbUrl: string;
    episodeCount: number;
    watchValue: string;
    isNewBook: boolean;
    tags: string[];
  },
) {
  const shouldFetchDetail =
    drama.episodeCount <= 0 || !drama.description || !drama.thumbUrl;

  if (!shouldFetchDetail) {
    return drama;
  }

  try {
    const payload = await fetchProviderJson(
      "detail",
      drama.providerName,
      { id: drama.providerDramaId },
      { revalidate: 3600 },
    );

    const detail = normalizeDetailMetadata(drama.providerName, payload);

    return mergeDramaMetadata(drama, detail);
  } catch {
    return drama;
  }
}

function mergeDramaMetadata(
  base: {
    providerDramaId: string;
    providerName: ProviderType;
    title: string;
    description: string;
    thumbUrl: string;
    episodeCount: number;
    watchValue: string;
    isNewBook: boolean;
    tags: string[];
  },
  detail: ProviderDetailMetadata,
) {
  return {
    ...base,
    title: detail.title || base.title,
    description: detail.description || base.description,
    thumbUrl: detail.thumbUrl || base.thumbUrl,
    episodeCount:
      typeof detail.episodeCount === "number" && detail.episodeCount > 0
        ? detail.episodeCount
        : base.episodeCount,
    watchValue: detail.watchValue || base.watchValue,
    isNewBook: detail.isNewBook ?? base.isNewBook,
    tags: detail.tags?.length ? detail.tags : base.tags,
  };
}

function shouldUseFastMetadataSync(provider: ProviderType) {
  return FAST_METADATA_SYNC_PROVIDERS.has(provider);
}

function prepareFastSyncMetadata(
  drama: {
    providerDramaId: string;
    providerName: ProviderType;
    title: string;
    description: string;
    thumbUrl: string;
    episodeCount: number;
    watchValue: string;
    isNewBook: boolean;
    tags: string[];
  },
  existing?: { episodeCount: number } | null,
) {
  if (drama.providerName !== "dramadash") {
    return drama;
  }

  return {
    ...drama,
    // DramaDash collection payload tidak membawa episode list. Detail dan stream
    // dicek bertahap oleh audit worker supaya sync manual tidak timeout.
    episodeCount: Math.max(existing?.episodeCount ?? 0, drama.episodeCount, 1),
  };
}

async function validateDramaStreamAvailability(drama: {
  providerDramaId: string;
  providerName: ProviderType;
  title: string;
}) : Promise<StreamValidationResult> {
  if (!STREAM_VALIDATION_PROVIDERS.has(drama.providerName)) {
    return { ok: true };
  }

  try {
    const resolved = await resolveStreamRequest({
      provider: drama.providerName,
      providerDramaId: drama.providerDramaId,
      episodeIndex: 1,
    });

    const payload = await fetchProviderJson(
      "stream",
      drama.providerName,
      resolved.streamArgs,
      { timeoutMs: 12000 },
    );

    const payloadError = getProviderPayloadError(payload);

    if (payloadError) {
      return {
        ok: false,
        message: `Skipped item because upstream stream validation failed for episode 1: ${payloadError}`,
      };
    }

    const normalized = normalizeStreamPayload({
      dramaId: drama.providerDramaId,
      provider: drama.providerName,
      episodeIndex: 1,
      payload,
    });

    if (!normalized.qualities.length) {
      return {
        ok: false,
        message:
          "Skipped item because episode 1 does not have any playable stream qualities.",
      };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      return {
        ok: false,
        message: `Skipped item because episode 1 stream returned upstream status ${error.status}: ${error.message}`,
      };
    }

    if (error instanceof RangeError) {
      return {
        ok: false,
        message: `Skipped item because episode 1 could not be resolved: ${error.message}`,
      };
    }

    return {
      ok: false,
      message:
        error instanceof Error
          ? `Skipped item because stream validation failed: ${error.message}`
          : "Skipped item because stream validation failed unexpectedly.",
    };
  }
}

function cleanValidationMessage(message: string) {
  return message
    .replace(/^Skipped item because\s+/i, "")
    .replace(/^episode 1/i, "Episode 1")
    .trim();
}

export async function runStoredDramaStreamAudit(
  source: SyncSource,
): Promise<StoredDramaStreamAuditResult> {
  const dramas = await prisma.drama.findMany({
    where: {
      providerName: {
        in: ACTIVE_PROVIDERS,
      },
      feedEntries: {
        some: {
          source,
        },
      },
    },
    orderBy: [
      {
        providerName: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      id: true,
      providerDramaId: true,
      providerName: true,
      title: true,
      isStreamPlayable: true,
    },
  });
  const providerSummaryMap = new Map<
    ProviderType,
    {
      provider: ProviderType;
      total: number;
      playable: number;
      hidden: number;
      restored: number;
      alreadyHidden: number;
      errors: number;
    }
  >();
  const errors: StoredDramaStreamAuditError[] = [];
  let playable = 0;
  let hidden = 0;
  let restored = 0;
  let alreadyHidden = 0;

  for (const drama of dramas) {
    const provider = drama.providerName as ProviderType;
    const summary = providerSummaryMap.get(provider) ?? {
      provider,
      total: 0,
      playable: 0,
      hidden: 0,
      restored: 0,
      alreadyHidden: 0,
      errors: 0,
    };

    summary.total += 1;

    const validation = await validateDramaStreamAvailability({
      providerDramaId: drama.providerDramaId,
      providerName: provider,
      title: drama.title,
    });
    const streamCheckedAt = new Date();
    const streamCheckMessage = validation.ok
      ? "Stream episode 1 normal saat audit ulang."
      : cleanValidationMessage(validation.message);

    await prisma.drama.update({
      where: {
        id: drama.id,
      },
      data: {
        isStreamPlayable: validation.ok,
        streamCheckMessage,
        streamCheckedAt,
      },
    });

    if (validation.ok) {
      playable += 1;
      summary.playable += 1;

      if (!drama.isStreamPlayable) {
        restored += 1;
        summary.restored += 1;
      }
    } else {
      hidden += 1;
      summary.hidden += 1;
      summary.errors += 1;

      if (!drama.isStreamPlayable) {
        alreadyHidden += 1;
        summary.alreadyHidden += 1;
      }

      errors.push({
        dramaId: drama.id,
        provider,
        providerDramaId: drama.providerDramaId,
        title: drama.title,
        message: streamCheckMessage,
        status: "hidden",
      });
    }

    providerSummaryMap.set(provider, summary);
  }

  return {
    source,
    total: dramas.length,
    checked: dramas.length,
    playable,
    hidden,
    restored,
    alreadyHidden,
    errors,
    providerSummary: [...providerSummaryMap.values()],
  };
}

export async function runStoredDramaStreamAuditBatch({
  source,
  cursor = null,
  batchSize = 10,
}: {
  source: SyncSource;
  cursor?: string | null;
  batchSize?: number;
}): Promise<StoredDramaStreamAuditBatchResult> {
  const resolvedBatchSize = Math.min(Math.max(Math.floor(batchSize), 1), 25);
  const [total, feedEntries] = await Promise.all([
    prisma.dramaFeed.count({
      where: {
        source,
        drama: {
          providerName: {
            in: ACTIVE_PROVIDERS,
          },
        },
      },
    }),
    prisma.dramaFeed.findMany({
      where: {
        source,
        drama: {
          providerName: {
            in: ACTIVE_PROVIDERS,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: resolvedBatchSize + 1,
      select: {
        id: true,
        drama: {
          select: {
            id: true,
            providerDramaId: true,
            providerName: true,
            title: true,
            isStreamPlayable: true,
          },
        },
      },
    }),
  ]);
  const batchEntries = feedEntries.slice(0, resolvedBatchSize);
  const providerSummaryMap = new Map<
    ProviderType,
    {
      provider: ProviderType;
      total: number;
      playable: number;
      hidden: number;
      restored: number;
      alreadyHidden: number;
      errors: number;
    }
  >();
  const errors: StoredDramaStreamAuditError[] = [];
  let playable = 0;
  let hidden = 0;
  let restored = 0;
  let alreadyHidden = 0;

  for (const entry of batchEntries) {
    const drama = entry.drama;
    const provider = drama.providerName as ProviderType;
    const summary = providerSummaryMap.get(provider) ?? {
      provider,
      total: 0,
      playable: 0,
      hidden: 0,
      restored: 0,
      alreadyHidden: 0,
      errors: 0,
    };

    summary.total += 1;

    const validation = await validateDramaStreamAvailability({
      providerDramaId: drama.providerDramaId,
      providerName: provider,
      title: drama.title,
    });
    const streamCheckedAt = new Date();
    const streamCheckMessage = validation.ok
      ? "Stream episode 1 normal saat audit ulang."
      : cleanValidationMessage(validation.message);

    await prisma.drama.update({
      where: {
        id: drama.id,
      },
      data: {
        isStreamPlayable: validation.ok,
        streamCheckMessage,
        streamCheckedAt,
      },
    });

    if (validation.ok) {
      playable += 1;
      summary.playable += 1;

      if (!drama.isStreamPlayable) {
        restored += 1;
        summary.restored += 1;
      }
    } else {
      hidden += 1;
      summary.hidden += 1;
      summary.errors += 1;

      if (!drama.isStreamPlayable) {
        alreadyHidden += 1;
        summary.alreadyHidden += 1;
      }

      errors.push({
        dramaId: drama.id,
        provider,
        providerDramaId: drama.providerDramaId,
        title: drama.title,
        message: streamCheckMessage,
        status: "hidden",
      });
    }

    providerSummaryMap.set(provider, summary);
  }

  const lastProcessedEntry = batchEntries.at(-1);

  return {
    source,
    total,
    checked: batchEntries.length,
    playable,
    hidden,
    restored,
    alreadyHidden,
    errors,
    providerSummary: [...providerSummaryMap.values()],
    batchSize: resolvedBatchSize,
    cursor,
    nextCursor: lastProcessedEntry?.id ?? null,
    hasMore: feedEntries.length > resolvedBatchSize,
  };
}

export async function runProviderSync(
  provider: ProviderType,
  page: number,
  source: SyncSource,
): Promise<ProviderSyncResult> {
  const payload = await fetchCollectionPayloadWithRetry(provider, source, page);
  const dramas = normalizeCollectionPayload(provider, payload);
  const errors: SyncError[] = [];

  let created = 0;
  let updated = 0;
  let hidden = 0;
  let skipped = 0;

  for (const drama of dramas) {
    try {
      const existing = await prisma.drama.findUnique({
        where: {
          providerName_providerDramaId: {
            providerName: drama.providerName,
            providerDramaId: drama.providerDramaId,
          },
        },
        select: {
          id: true,
          episodeCount: true,
        },
      });
      const useFastMetadataSync = shouldUseFastMetadataSync(drama.providerName);
      const enrichedDrama = useFastMetadataSync
        ? prepareFastSyncMetadata(drama, existing)
        : await enrichDramaMetadata(drama);

      if (!enrichedDrama.providerDramaId || !enrichedDrama.title) {
        skipped += 1;
        errors.push({
          providerDramaId: enrichedDrama.providerDramaId || null,
          message: "Skipped malformed upstream item: missing providerDramaId or title.",
        });
        continue;
      }

      const validation = useFastMetadataSync
        ? ({ ok: true } as const)
        : await validateDramaStreamAvailability(enrichedDrama);
      const streamCheckedAt = new Date();
      const streamCheckMessage = validation.ok
        ? useFastMetadataSync
          ? "Stream belum dicek saat sync cepat. Audit batch akan memvalidasi provider ini."
          : "Stream episode 1 normal saat sync terakhir."
        : validation.message;
      const createStreamStatus = useFastMetadataSync
        ? {
            isStreamPlayable: true,
            streamCheckMessage,
            streamCheckedAt: null,
          }
        : {
            isStreamPlayable: validation.ok,
            streamCheckMessage,
            streamCheckedAt,
          };
      const updateStreamStatus = useFastMetadataSync
        ? {}
        : {
            isStreamPlayable: validation.ok,
            streamCheckMessage,
            streamCheckedAt,
          };

      const storedDrama = await prisma.drama.upsert({
        where: {
          providerName_providerDramaId: {
            providerName: enrichedDrama.providerName,
            providerDramaId: enrichedDrama.providerDramaId,
          },
        },
        create: {
          ...enrichedDrama,
          ...createStreamStatus,
        },
        update: {
          title: enrichedDrama.title,
          description: enrichedDrama.description,
          thumbUrl: enrichedDrama.thumbUrl,
          episodeCount: enrichedDrama.episodeCount,
          watchValue: enrichedDrama.watchValue,
          isNewBook: enrichedDrama.isNewBook,
          tags: enrichedDrama.tags,
          ...updateStreamStatus,
        },
        select: { id: true },
      });

      await prisma.dramaFeed.upsert({
        where: {
          dramaId_source: {
            dramaId: storedDrama.id,
            source,
          },
        },
        create: {
          dramaId: storedDrama.id,
          source,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }

      if (!validation.ok) {
        hidden += 1;
        errors.push({
          providerDramaId: enrichedDrama.providerDramaId,
          message: "Drama disimpan sebagai tersembunyi karena stream episode 1 gagal: " + validation.message,
        });
      }
    } catch (error) {
      skipped += 1;
      errors.push({
        providerDramaId: drama.providerDramaId || null,
        message:
          error instanceof Error ? error.message : "Unknown database error.",
      });
    }
  }

  return {
    provider,
    source,
    page,
    processed: dramas.length,
    created,
    updated,
    hidden,
    skipped,
    errors,
  };
}

export async function runBatchSync({
  providers,
  pages,
  sources,
}: {
  providers: ProviderType[];
  pages: number[];
  sources: SyncSource[];
}): Promise<BatchSyncResult> {
  const startedAt = new Date().toISOString();
  const results: ProviderSyncResult[] = [];

  for (const provider of providers) {
    for (const source of sources) {
      for (const page of pages) {
        results.push(await runProviderSync(provider, page, source));
      }
    }
  }

  const finishedAt = new Date().toISOString();

  return {
    startedAt,
    finishedAt,
    providers: results,
    totals: {
      processed: results.reduce((sum, result) => sum + result.processed, 0),
      created: results.reduce((sum, result) => sum + result.created, 0),
      updated: results.reduce((sum, result) => sum + result.updated, 0),
      hidden: results.reduce((sum, result) => sum + result.hidden, 0),
      skipped: results.reduce((sum, result) => sum + result.skipped, 0),
      errors: results.reduce((sum, result) => sum + result.errors.length, 0),
    },
  };
}
