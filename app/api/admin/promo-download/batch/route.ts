import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import {
  enqueuePromoDownloadAll,
  getPromoDownloadSummary,
} from "@/lib/promo-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readInternalDramaId(request: NextRequest) {
  return request.nextUrl.searchParams.get("internalDramaId")?.trim() || "";
}

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalDramaId = readInternalDramaId(request);

  if (!internalDramaId) {
    return NextResponse.json(
      { error: "Query param `internalDramaId` wajib diisi." },
      { status: 400 },
    );
  }

  const summary = await getPromoDownloadSummary(internalDramaId);

  if (!summary) {
    return NextResponse.json({ error: "Drama tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    internalDramaId?: unknown;
  } | null;
  const internalDramaId =
    typeof body?.internalDramaId === "string" ? body.internalDramaId.trim() : "";

  if (!internalDramaId) {
    return NextResponse.json(
      { error: "Body `internalDramaId` wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const summary = await enqueuePromoDownloadAll(internalDramaId);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat antrean download promo.",
      },
      { status: 400 },
    );
  }
}
