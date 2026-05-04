import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import { signPromoDownloadUrl } from "@/lib/promo-download-links";
import { getPromoDownloadSubtitleInfo } from "@/lib/promo-download-rendering";
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

function buildRenderUrl(
  internalDramaId: string,
  episodeIndex: number,
  qualityKind: "mp4" | "hls",
  qualityIndex: number,
) {
  const searchParams = new URLSearchParams({
    internalDramaId,
    episodeIndex: String(episodeIndex),
    qualityKind,
    qualityIndex: String(qualityIndex),
  });

  return signPromoDownloadUrl(
    `/api/admin/promo-download/render?${searchParams.toString()}`,
  );
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function buildFfmpegCommand(
  sourceUrl: string,
  filename: string,
  shouldBurnSubtitle: boolean,
) {
  if (shouldBurnSubtitle) {
    return (
      "ffmpeg -i \"" +
      sourceUrl +
      "\" -vf \"subtitles=subtitle.vtt\" -c:v libx264 -c:a aac \"" +
      filename +
      "\""
    );
  }

  return "ffmpeg -i \"" + sourceUrl + "\" -c copy \"" + filename + "\"";
}

function buildMessage({
  hasMp4,
  hasHls,
  hasSubtitle,
}: {
  hasMp4: boolean;
  hasHls: boolean;
  hasSubtitle: boolean;
}) {
  if (!hasMp4 && !hasHls) {
    return "Episode ini belum menyediakan source yang bisa diunduh.";
  }

  const subtitleMessage = hasSubtitle
    ? "Subtitle Indonesia akan dibakar permanen ke file MP4."
    : "Subtitle Indonesia tidak tersedia; video tetap bisa diunduh tanpa subtitle.";

  if (hasMp4) {
    return hasSubtitle
      ? `MP4 tersedia. Server akan menjalankan FFmpeg untuk burn-in subtitle. ${subtitleMessage}`
      : `MP4 siap diunduh langsung ke device admin. ${subtitleMessage}`;
  }

  return `Episode ini memakai HLS. Server akan menjalankan FFmpeg untuk menyatukan .m3u8 menjadi MP4. ${subtitleMessage}`;
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
    const subtitle = getPromoDownloadSubtitleInfo(resolved.stream.subtitles);
    const shouldBurnSubtitle = subtitle.status === "available";
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
      subtitle,
      message: buildMessage({
        hasMp4: Boolean(bestMp4),
        hasHls: Boolean(bestHls),
        hasSubtitle: shouldBurnSubtitle,
      }),
      bestDownload: bestMp4
        ? {
            label: shouldBurnSubtitle
              ? `${bestMp4.label} + subtitle burn-in`
              : bestMp4.label,
            mimeType: bestMp4.mimeType,
            sourceUrl: bestMp4.url,
            downloadUrl: shouldBurnSubtitle
              ? buildRenderUrl(internalDramaId, episodeIndex, "mp4", 0)
              : buildDownloadUrl(bestMp4.url, `${baseFilename}.mp4`),
          }
        : bestHls
          ? {
              label: shouldBurnSubtitle
                ? `${bestHls.label} HLS -> MP4 + subtitle burn-in`
                : `${bestHls.label} HLS -> MP4`,
              mimeType: bestHls.mimeType,
              sourceUrl: bestHls.url,
              downloadUrl: buildRenderUrl(internalDramaId, episodeIndex, "hls", 0),
            }
        : null,
      mp4Qualities: mp4Qualities.map((quality, index) => ({
        label: shouldBurnSubtitle
          ? `${quality.label} + subtitle burn-in`
          : quality.label,
        mimeType: quality.mimeType,
        sourceUrl: quality.url,
        downloadUrl: shouldBurnSubtitle
          ? buildRenderUrl(internalDramaId, episodeIndex, "mp4", index)
          : buildDownloadUrl(quality.url, `${baseFilename}-${index + 1}.mp4`),
      })),
      hlsQualities: hlsQualities.map((quality, index) => ({
        label: shouldBurnSubtitle
          ? `${quality.label} + subtitle burn-in`
          : quality.label,
        mimeType: quality.mimeType,
        sourceUrl: quality.url,
        downloadUrl: buildRenderUrl(internalDramaId, episodeIndex, "hls", index),
        ffmpegCommand: buildFfmpegCommand(
          quality.url,
          `${baseFilename}-hls-${index + 1}.mp4`,
          shouldBurnSubtitle,
        ),
      })),
    });
  } catch (error) {
    const resolvedError = toStreamErrorResponse(error);
    return NextResponse.json(resolvedError.body, { status: resolvedError.status });
  }
}
