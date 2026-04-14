import { prisma } from "@/lib/prisma";
import {
  getProviderPayloadError,
  normalizeStreamPayload,
  PROVIDERS,
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

const STREAM_VALIDATION_PROVIDERS = new Set<ProviderType>(PROVIDERS);

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
      const enrichedDrama = await enrichDramaMetadata(drama);

      if (!enrichedDrama.providerDramaId || !enrichedDrama.title) {
        skipped += 1;
        errors.push({
          providerDramaId: enrichedDrama.providerDramaId || null,
          message: "Skipped malformed upstream item: missing providerDramaId or title.",
        });
        continue;
      }

      const validation = await validateDramaStreamAvailability(enrichedDrama);
      const streamCheckedAt = new Date();
      const streamCheckMessage = validation.ok
        ? "Stream episode 1 normal saat sync terakhir."
        : validation.message;

      const existing = await prisma.drama.findUnique({
        where: {
          providerName_providerDramaId: {
            providerName: enrichedDrama.providerName,
            providerDramaId: enrichedDrama.providerDramaId,
          },
        },
        select: { id: true },
      });

      const storedDrama = await prisma.drama.upsert({
        where: {
          providerName_providerDramaId: {
            providerName: enrichedDrama.providerName,
            providerDramaId: enrichedDrama.providerDramaId,
          },
        },
        create: {
          ...enrichedDrama,
          isStreamPlayable: validation.ok,
          streamCheckMessage,
          streamCheckedAt,
        },
        update: {
          title: enrichedDrama.title,
          description: enrichedDrama.description,
          thumbUrl: enrichedDrama.thumbUrl,
          episodeCount: enrichedDrama.episodeCount,
          watchValue: enrichedDrama.watchValue,
          isNewBook: enrichedDrama.isNewBook,
          tags: enrichedDrama.tags,
          isStreamPlayable: validation.ok,
          streamCheckMessage,
          streamCheckedAt,
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
