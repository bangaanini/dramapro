import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { hasValidInternalSecret } from "@/lib/internal-route-auth";
import { prisma } from "@/lib/prisma";
import {
  enqueueProviderEndpointSync,
  getProviderSyncDashboard,
  initializeStreamApiCatalog,
  isStreamApiProviderCode,
  logProviderWorker,
  setProviderHomepageVisibility,
  validateProviderEndpointInput,
} from "@/lib/provider-sync";
import { getProvider } from "@/lib/streamapi/registry";
import type { JsonRecord } from "@/lib/streamapi/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdminFromRequestSafe(request: NextRequest) {
  const { getAdminFromRequest } = await import("@/lib/admin-auth");
  return getAdminFromRequest(request);
}

async function assertAuthorized(request: NextRequest) {
  const admin = await getAdminFromRequestSafe(request);
  const hasValidSecret = hasValidInternalSecret(request);
  return Boolean(admin || hasValidSecret);
}

function bodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  if (!(await assertAuthorized(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dashboard = await getProviderSyncDashboard();
  return Response.json(dashboard, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await assertAuthorized(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = bodyRecord(await request.json().catch(() => null));
  const mode = String(body.mode ?? "").trim();

  try {
    if (mode === "init") {
      await initializeStreamApiCatalog();
      await logProviderWorker({
        level: "info",
        message: "StreamAPI providers initialized and legacy catalog hidden from homepage.",
      });

      return Response.json({
        ok: true,
        dashboard: await getProviderSyncDashboard(),
      });
    }

    if (mode === "homepage-visibility") {
      const provider = String(body.provider ?? "").trim();

      if (!isStreamApiProviderCode(provider)) {
        return Response.json({ error: "Provider tidak valid." }, { status: 400 });
      }

      if (typeof body.isHomepageVisible !== "boolean") {
        return Response.json(
          { error: "Status tampil homepage tidak valid." },
          { status: 400 },
        );
      }

      const visibility = await setProviderHomepageVisibility(
        provider,
        body.isHomepageVisible,
      );

      revalidateTag("catalog-home", "max");
      revalidateTag("catalog-shortcuts", "max");
      revalidatePath("/");
      revalidatePath("/search");

      return Response.json({
        ok: true,
        visibility,
        dashboard: await getProviderSyncDashboard(),
      });
    }

    const validated = validateProviderEndpointInput({
      provider: String(body.provider ?? ""),
      section: String(body.section ?? ""),
      page: body.page,
      params: body.params,
      lang: "id",
    });

    if (mode === "health") {
      const adapter = getProvider(validated.provider);
      const startedAt = Date.now();
      const result = await adapter.listCatalog({
        provider: validated.provider,
        section: validated.section.value,
        page: validated.page,
        lang: validated.lang,
        params: validated.params,
      });
      const externalIds = Array.from(
        new Set(
          result.items
            .map((item) => item.externalId.trim())
            .filter(Boolean),
        ),
      );
      const existingSeries = externalIds.length
        ? await prisma.catalogSeries.findMany({
            where: {
              platformId: validated.provider,
              upstreamSeriesId: {
                in: externalIds,
              },
            },
            select: {
              id: true,
              upstreamSeriesId: true,
              title: true,
            },
          })
        : [];
      const existingByExternalId = new Map(
        existingSeries.map((series) => [series.upstreamSeriesId, series]),
      );
      const savedCount = result.items.filter((item) =>
        existingByExternalId.has(item.externalId),
      ).length;

      await logProviderWorker({
        level: "info",
        message: `Health check ${validated.provider}/${validated.section.value} ok.`,
        meta: {
          provider: validated.provider,
          section: validated.section.value,
          page: validated.page,
          params: validated.params,
          count: result.items.length,
          ms: Date.now() - startedAt,
        } as JsonRecord,
      });

      return Response.json({
        ok: true,
        health: {
          provider: validated.provider,
          section: validated.section.value,
          count: result.items.length,
          savedCount,
          newCount: Math.max(0, result.items.length - savedCount),
          durationMs: Date.now() - startedAt,
          items: result.items.slice(0, 20).map((item) => {
            const existing = existingByExternalId.get(item.externalId);
            return {
              externalId: item.externalId,
              title: item.title,
              status: existing ? "saved" : "new",
              seriesId: existing?.id ?? null,
              savedTitle: existing?.title ?? null,
            };
          }),
        },
        dashboard: await getProviderSyncDashboard(),
      });
    }

    if (mode === "enqueue") {
      await initializeStreamApiCatalog();
      const job = await enqueueProviderEndpointSync(
        validated.provider,
        validated.section.value,
        validated.page,
        validated.params,
        validated.lang,
      );

      await logProviderWorker({
        level: "info",
        message: `Queued ${validated.provider}/${validated.section.value} page ${validated.page}.`,
        meta: {
          provider: validated.provider,
          section: validated.section.value,
          page: validated.page,
          params: validated.params,
          jobId: job.id,
        } as JsonRecord,
      });

      return Response.json({
        ok: true,
        job,
        dashboard: await getProviderSyncDashboard(),
      });
    }

    return Response.json({ error: "Mode tidak dikenal." }, { status: 400 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Provider sync request failed.",
      },
      { status: 400 },
    );
  }
}
