import { prisma } from "@/lib/prisma";
import {
  ProviderType,
  SyncSource,
  UpstreamHttpError,
  fetchProviderJson,
  normalizeCollectionPayload,
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

  while (attempts < 2) {
    try {
      return await fetchProviderJson(source, provider, { page });
    } catch (error) {
      attempts += 1;

      if (
        error instanceof UpstreamHttpError &&
        attempts < 2 &&
        (error.status === 429 || error.status >= 500)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Home fetch retry loop exhausted.");
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
      if (!drama.providerDramaId || !drama.title) {
        skipped += 1;
        errors.push({
          providerDramaId: drama.providerDramaId || null,
          message: "Missing providerDramaId or title.",
        });
        continue;
      }

      const existing = await prisma.drama.findUnique({
        where: {
          providerName_providerDramaId: {
            providerName: drama.providerName,
            providerDramaId: drama.providerDramaId,
          },
        },
        select: { id: true },
      });

      await prisma.drama.upsert({
        where: {
          providerName_providerDramaId: {
            providerName: drama.providerName,
            providerDramaId: drama.providerDramaId,
          },
        },
        create: drama,
        update: {
          title: drama.title,
          description: drama.description,
          thumbUrl: drama.thumbUrl,
          episodeCount: drama.episodeCount,
          watchValue: drama.watchValue,
          isNewBook: drama.isNewBook,
          tags: drama.tags,
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
