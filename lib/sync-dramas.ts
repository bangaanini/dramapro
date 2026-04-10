import { prisma } from "@/lib/prisma";
import {
  ProviderType,
  ProviderDetailMetadata,
  SyncSource,
  UpstreamHttpError,
  fetchProviderJson,
  normalizeCollectionPayload,
  normalizeDetailMetadata,
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
    skipped: number;
    errors: number;
  };
};

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
        create: enrichedDrama,
        update: {
          title: enrichedDrama.title,
          description: enrichedDrama.description,
          thumbUrl: enrichedDrama.thumbUrl,
          episodeCount: enrichedDrama.episodeCount,
          watchValue: enrichedDrama.watchValue,
          isNewBook: enrichedDrama.isNewBook,
          tags: enrichedDrama.tags,
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
      skipped: results.reduce((sum, result) => sum + result.skipped, 0),
      errors: results.reduce((sum, result) => sum + result.errors.length, 0),
    },
  };
}
