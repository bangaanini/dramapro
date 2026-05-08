import { spawn, spawnSync } from "node:child_process";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import {
  getPartnerDownloadBotForOwner,
  PartnerDownloadError,
} from "@/lib/partner-downloads";
import { isPromoDownloadSignedRequest } from "@/lib/promo-download-links";
import {
  buildPromoDownloadFfmpegArgs,
  createNormalizedSubtitleTempFile,
  removePromoSubtitleTempFile,
} from "@/lib/promo-download-rendering";
import { prisma } from "@/lib/prisma";
import { resolveDramaStreamSources, toStreamErrorResponse } from "@/lib/stream-access";
import { findIndonesianSubtitle } from "@/lib/subtitles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FFMPEG_PATH = process.env.FFMPEG_PATH?.trim() || "ffmpeg";

function parsePositiveInt(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseQualityIndex(value: string | null) {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseQualityKind(value: string | null): "mp4" | "hls" {
  return value === "mp4" ? "mp4" : "hls";
}

function sanitizeFilename(value: string) {
  return (
    value
      .replace(/[^\w\s.-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 100) || "partner-video"
  );
}

function toAbsoluteUrl(url: string, origin: string) {
  return new URL(url, origin).toString();
}

function getInternalOrigin() {
  const explicitOrigin = process.env.PROMO_DOWNLOAD_INTERNAL_ORIGIN?.trim();

  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/u, "");
  }

  return `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`;
}

function ensureFfmpegAvailable() {
  const result = spawnSync(FFMPEG_PATH, ["-version"], {
    stdio: "ignore",
    timeout: 3_000,
  });

  return !(result.error || result.status !== 0);
}

export async function GET(request: NextRequest) {
  if (!isPromoDownloadSignedRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalDramaId = request.nextUrl.searchParams.get("internalDramaId");
  const episodeIndex = parsePositiveInt(request.nextUrl.searchParams.get("episodeIndex"));
  const qualityIndex = parseQualityIndex(request.nextUrl.searchParams.get("qualityIndex"));
  const qualityKind = parseQualityKind(request.nextUrl.searchParams.get("qualityKind"));
  const partnerBotId = request.nextUrl.searchParams.get("partnerBotId")?.trim() || "";
  const partnerUserId =
    request.nextUrl.searchParams.get("partnerUserId")?.trim() || "";

  if (!internalDramaId || !episodeIndex || !partnerBotId || !partnerUserId) {
    return NextResponse.json(
      {
        error:
          "Query params `internalDramaId`, `episodeIndex`, `partnerBotId`, dan `partnerUserId` wajib diisi.",
      },
      { status: 400 },
    );
  }

  if (!ensureFfmpegAvailable()) {
    return NextResponse.json(
      {
        error:
          "FFmpeg belum tersedia di server. Install ffmpeg atau set FFMPEG_PATH.",
      },
      { status: 503 },
    );
  }

  try {
    const partnerBot = await prisma.telegramPartnerBot.findUnique({
      where: { id: partnerBotId },
      select: {
        botUsername: true,
        downloadDailyLimit: true,
        downloadEnabled: true,
        id: true,
        isEnabled: true,
        ownerUserId: true,
      },
    });

    if (!partnerBot || partnerBot.ownerUserId !== partnerUserId) {
      throw new PartnerDownloadError("Link download partner tidak valid.", 403);
    }

    const ownerBot = await getPartnerDownloadBotForOwner({
      botUsername: partnerBot.botUsername,
      ownerUserId: partnerUserId,
    });

    if (
      !ownerBot?.isEnabled ||
      !ownerBot.downloadEnabled ||
      ownerBot.downloadDailyLimit <= 0
    ) {
      throw new PartnerDownloadError(
        "Download partner sudah dinonaktifkan admin.",
        403,
      );
    }

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
    const selectableQualities = qualityKind === "mp4" ? mp4Qualities : hlsQualities;
    const selectedQuality = selectableQualities[qualityIndex] ?? selectableQualities[0];

    if (!selectedQuality) {
      return NextResponse.json(
        { error: `Source ${qualityKind.toUpperCase()} tidak tersedia untuk episode ini.` },
        { status: 404 },
      );
    }

    const internalOrigin = getInternalOrigin();
    const publicOrigin = request.nextUrl.origin;
    const sourceUrl = toAbsoluteUrl(selectedQuality.url, internalOrigin);
    const subtitle = findIndonesianSubtitle(resolved.stream.subtitles);
    const subtitleTempFile = subtitle
      ? await createNormalizedSubtitleTempFile(
          toAbsoluteUrl(subtitle.url, internalOrigin),
        )
      : null;
    const filename = `${sanitizeFilename(
      `${resolved.drama.title}-ep-${episodeIndex}-${selectedQuality.label}`,
    )}.mp4`;
    const ffmpeg = spawn(
      FFMPEG_PATH,
      buildPromoDownloadFfmpegArgs(sourceUrl, "pipe:1", {
        refererOrigin: publicOrigin,
        allowAllExtensions: qualityKind === "hls",
        subtitlePath: subtitleTempFile?.path ?? null,
        fragmented: true,
      }),
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stderr = "";
    let didCleanSubtitle = false;
    const cleanupSubtitle = () => {
      if (didCleanSubtitle) {
        return;
      }

      didCleanSubtitle = true;
      void removePromoSubtitleTempFile(subtitleTempFile);
    };

    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-4_000);
    });

    ffmpeg.on("close", (code) => {
      cleanupSubtitle();
      if (code && code !== 0) {
        console.error(
          `[partner-download] ffmpeg exited with code ${code}: ${stderr || "no stderr"}`,
        );
      }
    });
    ffmpeg.on("error", cleanupSubtitle);

    request.signal.addEventListener("abort", () => {
      if (!ffmpeg.killed) {
        ffmpeg.kill("SIGKILL");
      }
    });

    return new Response(Readable.toWeb(ffmpeg.stdout) as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "https://web.telegram.org",
        Vary: "Origin",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof PartnerDownloadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[partner-download] render failed", {
      internalDramaId,
      episodeIndex,
      qualityKind,
      qualityIndex,
      error,
    });
    const resolvedError = toStreamErrorResponse(error);
    return NextResponse.json(resolvedError.body, {
      status: resolvedError.status === 502 ? 500 : resolvedError.status,
    });
  }
}
