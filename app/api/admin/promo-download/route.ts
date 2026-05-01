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

function buildHlsRenderUrl(internalDramaId: string, episodeIndex: number, qualityIndex: number) {
  const searchParams = new URLSearchParams({
    internalDramaId,
    episodeIndex: String(episodeIndex),
    qualityIndex: String(qualityIndex),
  });

  return `/api/admin/promo-download/render?${searchParams.toString()}`;
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function buildFfmpegCommand(sourceUrl: string, filename: string) {
  return "ffmpeg -i \"" + sourceUrl + "\" -c copy \"" + filename + "\"";
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
    const bestHls = hlsQualities[0] ?? null;
    const baseFilename = sanitizeFilename(
      `${resolved.drama.title}-ep-${episodeIndex}`,
    );

    return NextResponse.json({
      dramaId: resolved.drama.id,
      title: resolved.drama.title,
      provider: resolved.drama.platformId,
      episodeIndex,
      sourceType: bestMp4 ? "mp4" : "hls",
      downloadable: Boolean(bestMp4 || bestHls),
      message: bestMp4
        ? "MP4 siap diunduh langsung ke device admin."
        : bestHls
          ? "Episode ini memakai HLS. Server akan menjalankan FFmpeg untuk menyatukan .m3u8 menjadi MP4 saat admin klik download."
          : "Episode ini belum menyediakan source yang bisa diunduh.",
      bestDownload: bestMp4
        ? {
            label: bestMp4.label,
            mimeType: bestMp4.mimeType,
            sourceUrl: bestMp4.url,
            downloadUrl: buildDownloadUrl(bestMp4.url, `${baseFilename}.mp4`),
          }
        : bestHls
          ? {
              label: `${bestHls.label} HLS -> MP4`,
              mimeType: bestHls.mimeType,
              sourceUrl: bestHls.url,
              downloadUrl: buildHlsRenderUrl(internalDramaId, episodeIndex, 0),
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
      hlsQualities: hlsQualities.map((quality, index) => ({
        label: quality.label,
        mimeType: quality.mimeType,
        sourceUrl: quality.url,
        downloadUrl: buildHlsRenderUrl(internalDramaId, episodeIndex, index),
        ffmpegCommand: buildFfmpegCommand(
          quality.url,
          `${baseFilename}-hls-${index + 1}.mp4`,
        ),
      })),
    });
  } catch (error) {
    const resolvedError = toStreamErrorResponse(error);
    return NextResponse.json(resolvedError.body, { status: resolvedError.status });
  }
}
