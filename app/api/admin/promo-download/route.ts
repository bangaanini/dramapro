import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import { resolveDramaStreamSources, toStreamErrorResponse } from "@/lib/stream-access";

export const runtime = "nodejs";

function parseEpisodeIndex(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildDownloadUrl(url: string, filename: string) {
  const searchParams = new URLSearchParams({
    url,
    download: "1",
    filename,
  });

  return `/api/media?${searchParams.toString()}`;
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalDramaId = request.nextUrl.searchParams.get("internalDramaId");
  const episodeIndex = parseEpisodeIndex(
    request.nextUrl.searchParams.get("episodeIndex"),
  );

  if (!internalDramaId || !episodeIndex) {
    return NextResponse.json(
      {
        error:
          "Query params `internalDramaId` and `episodeIndex` are required.",
      },
      { status: 400 },
    );
  }

  try {
    const resolved = await resolveDramaStreamSources({
      internalDramaId,
      episodeIndex,
      bypassVipLock: true,
    });

    const mp4Qualities = resolved.stream.qualities.filter(
      (quality) => quality.mimeType === "video/mp4",
    );
    const hlsQualities = resolved.stream.qualities.filter(
      (quality) => quality.mimeType === "application/x-mpegURL",
    );
    const bestMp4 = mp4Qualities[0] ?? null;
    const baseFilename = sanitizeFilename(
      `${resolved.drama.title}-ep-${episodeIndex}`,
    );

    return NextResponse.json({
      dramaId: resolved.drama.id,
      title: resolved.drama.title,
      provider: resolved.drama.providerName,
      episodeIndex,
      sourceType: bestMp4 ? "mp4" : "hls",
      downloadable: Boolean(bestMp4),
      message: bestMp4
        ? "MP4 siap diunduh langsung ke device admin."
        : "Episode ini hanya menyediakan source HLS. Gunakan link promo/copy link pada v1.",
      bestDownload: bestMp4
        ? {
            label: bestMp4.label,
            mimeType: bestMp4.mimeType,
            sourceUrl: bestMp4.url,
            downloadUrl: buildDownloadUrl(bestMp4.url, `${baseFilename}.mp4`),
          }
        : null,
      mp4Qualities: mp4Qualities.map((quality, index) => ({
        label: quality.label,
        mimeType: quality.mimeType,
        sourceUrl: quality.url,
        downloadUrl: buildDownloadUrl(
          quality.url,
          `${baseFilename}-${index + 1}.mp4`,
        ),
      })),
      hlsQualities: hlsQualities.map((quality) => ({
        label: quality.label,
        mimeType: quality.mimeType,
        sourceUrl: quality.url,
      })),
    });
  } catch (error) {
    const resolvedError = toStreamErrorResponse(error);
    return NextResponse.json(resolvedError.body, { status: resolvedError.status });
  }
}
