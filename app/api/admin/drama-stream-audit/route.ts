import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import {
  normalizeSyncSource,
  SYNC_SOURCES,
} from "@/lib/provider-adapter";
import { runStoredDramaStreamAuditBatch } from "@/lib/sync-dramas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        batchSize?: number;
        cursor?: string | null;
        source?: string;
      }
    | null;
  const source = normalizeSyncSource(payload?.source ?? "");

  if (!source) {
    return NextResponse.json(
      {
        error: "Source audit tidak valid.",
        supportedSources: [...SYNC_SOURCES, "populer"],
      },
      { status: 400 },
    );
  }

  const result = await runStoredDramaStreamAuditBatch({
    source,
    cursor: payload?.cursor ?? null,
    batchSize: payload?.batchSize,
  });

  revalidateTag("catalog-home", "max");
  revalidateTag("catalog-shortcuts", "max");

  return NextResponse.json({
    ...result,
    message:
      result.hidden > 0
        ? `Batch ${source} selesai. ${result.checked} drama dicek, ${result.hidden} drama disembunyikan karena error stream.`
        : `Batch ${source} selesai. ${result.checked} drama playable.`,
  });
}
