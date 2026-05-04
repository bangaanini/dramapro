import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import { getPromoDownloadFile } from "@/lib/promo-download";
import { isPromoDownloadSignedRequest } from "@/lib/promo-download-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin && !isPromoDownloadSignedRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId")?.trim() || "";

  if (!jobId) {
    return NextResponse.json(
      { error: "Query param `jobId` wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const file = await getPromoDownloadFile(jobId);

    if (!file) {
      return NextResponse.json(
        { error: "File download belum tersedia." },
        { status: 404 },
      );
    }

    return new Response(
      Readable.toWeb(createReadStream(file.absolutePath)) as ReadableStream<Uint8Array>,
      {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(file.size),
          "Content-Disposition": `attachment; filename="${file.filename}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
          "Cache-Control": "private, no-store",
          "Access-Control-Allow-Origin": "https://web.telegram.org",
          Vary: "Origin",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal membaca file download.",
      },
      { status: 500 },
    );
  }
}
