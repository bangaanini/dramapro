import { spawn, spawnSync } from "node:child_process";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import { resolveDramaStreamSources, toStreamErrorResponse } from "@/lib/stream-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FFMPEG_PATH = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
const FFMPEG_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function parsePositiveInt(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseQualityIndex(value: string | null) {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function sanitizeFilename(value: string) {
  return (
    value
      .replace(/[^\w\s.-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 100) || "promo-video"
  );
}

function toAbsoluteUrl(url: string, origin: string) {
  return new URL(url, origin).toString();
}

function ensureFfmpegAvailable() {
  const result = spawnSync(FFMPEG_PATH, ["-version"], {
    stdio: "ignore",
    timeout: 3_000,
  });

  if (result.error || result.status !== 0) {
    return false;
  }

  return true;
}

function buildFfmpegArgs(sourceUrl: string, origin: string) {
  return [
    "-hide_banner",
    "-loglevel",
    process.env.FFMPEG_LOG_LEVEL?.trim() || "error",
    "-nostdin",
    "-protocol_whitelist",
    "file,http,https,tcp,tls,crypto,data",
    "-allowed_extensions",
    "ALL",
    "-user_agent",
    FFMPEG_USER_AGENT,
    "-headers",
    `Referer: ${origin}\r\nOrigin: ${origin}\r\n`,
    "-i",
    sourceUrl,
    "-map",
    "0:v:0?",
    "-map",
    "0:a:0?",
    "-c",
    "copy",
    "-bsf:a",
    "aac_adtstoasc",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "-f",
    "mp4",
    "pipe:1",
  ];
}

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalDramaId = request.nextUrl.searchParams.get("internalDramaId");
  const episodeIndex = parsePositiveInt(request.nextUrl.searchParams.get("episodeIndex"));
  const qualityIndex = parseQualityIndex(request.nextUrl.searchParams.get("qualityIndex"));

  if (!internalDramaId || !episodeIndex) {
    return NextResponse.json(
      {
        error:
          "Query params `internalDramaId` and `episodeIndex` are required.",
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
    const resolved = await resolveDramaStreamSources({
      internalDramaId,
      episodeIndex,
      bypassVipLock: true,
    });
    const hlsQualities = resolved.stream.qualities.filter(
      (quality) => quality.mimeType === "application/x-mpegURL",
    );
    const selectedQuality = hlsQualities[qualityIndex] ?? hlsQualities[0];

    if (!selectedQuality) {
      return NextResponse.json(
        { error: "Source HLS tidak tersedia untuk episode ini." },
        { status: 404 },
      );
    }

    const sourceUrl = toAbsoluteUrl(selectedQuality.url, request.nextUrl.origin);
    const filename = `${sanitizeFilename(
      `${resolved.drama.title}-ep-${episodeIndex}-${selectedQuality.label}`,
    )}.mp4`;
    const ffmpeg = spawn(FFMPEG_PATH, buildFfmpegArgs(sourceUrl, request.nextUrl.origin), {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";

    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-4_000);
    });

    ffmpeg.on("close", (code) => {
      if (code && code !== 0) {
        console.error(
          `[promo-download] ffmpeg exited with code ${code}: ${stderr || "no stderr"}`,
        );
      }
    });

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
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const resolvedError = toStreamErrorResponse(error);
    return NextResponse.json(resolvedError.body, { status: resolvedError.status });
  }
}
