import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  PROVIDERS,
  ProviderType,
  UpstreamHttpError,
  fetchProviderJson,
  isProviderType,
  normalizeHomePayload,
} from "@/lib/provider-adapter";

export const runtime = "nodejs";

type SyncError = {
  providerDramaId: string | null;
  message: string;
};

function getSecretFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-cron-secret");
}

async function fetchHomePayloadWithRetry(provider: ProviderType, page: number) {
  let attempts = 0;

  while (attempts < 2) {
    try {
      return await fetchProviderJson("home", provider, { page });
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

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  const suppliedSecret = getSecretFromRequest(request);

  if (suppliedSecret !== cronSecret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const providerParam = request.nextUrl.searchParams.get("provider");
  const pageParam = request.nextUrl.searchParams.get("page") ?? "1";
  const page = Number.parseInt(pageParam, 10);

  if (!providerParam || !isProviderType(providerParam)) {
    return Response.json(
      {
        error: "Invalid provider.",
        supportedProviders: PROVIDERS,
      },
      { status: 400 },
    );
  }

  if (!Number.isInteger(page) || page < 1) {
    return Response.json(
      { error: "Query param `page` must be an integer greater than 0." },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchHomePayloadWithRetry(providerParam, page);
    const dramas = normalizeHomePayload(providerParam, payload);
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

    return Response.json({
      provider: providerParam,
      page,
      processed: dramas.length,
      created,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    if (error instanceof UpstreamHttpError) {
      return Response.json(
        {
          error: "Upstream request failed.",
          provider: providerParam,
          status: error.status,
          detail: error.message,
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected sync failure.",
      },
      { status: 502 },
    );
  }
}
