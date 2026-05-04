import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  findIndonesianSubtitle,
  normalizeSubtitleToVtt,
  type SubtitleCandidate,
} from "@/lib/subtitles";

export const CURRENT_PROMO_DOWNLOAD_OUTPUT_VERSION = 4;
export const PROMO_DOWNLOAD_SUBTITLE_MODE = "burn-in";
export type PromoDownloadSubtitleStatus = "burned" | "missing";

export const FFMPEG_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const FFMPEG_LOG_LEVEL = process.env.FFMPEG_LOG_LEVEL?.trim() || "error";
const DEFAULT_SUBTITLE_FORCE_STYLE =
  "FontName=Arial,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=38,Alignment=2";

export function getPromoDownloadSubtitleInfo(subtitles: SubtitleCandidate[]) {
  const subtitle = findIndonesianSubtitle(subtitles);

  return {
    mode: PROMO_DOWNLOAD_SUBTITLE_MODE,
    status: subtitle ? "available" : "missing",
    label: subtitle?.label ?? null,
    language: subtitle?.language ?? null,
  } as const;
}

export async function createNormalizedSubtitleTempFile(subtitleUrl: string) {
  const directory = await mkdtemp(
    join(/*turbopackIgnore: true*/ tmpdir(), "promo-subtitle-"),
  );
  const path = join(directory, "subtitle.vtt");

  try {
    const response = await fetch(subtitleUrl, {
      headers: {
        Accept: "text/vtt, application/x-subrip, text/plain, */*",
        "User-Agent": FFMPEG_USER_AGENT,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`Fetch subtitle gagal dengan status ${response.status}.`);
    }

    const normalized = normalizeSubtitleToVtt(await response.text());

    if (!normalized) {
      throw new Error("Format subtitle tidak didukung untuk burn-in.");
    }

    await writeFile(path, normalized, "utf8");

    return { directory, path };
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function removePromoSubtitleTempFile(
  tempFile: { directory: string } | null | undefined,
) {
  if (!tempFile) {
    return;
  }

  await rm(tempFile.directory, { recursive: true, force: true }).catch(
    () => undefined,
  );
}

function getSubtitleForceStyle() {
  return process.env.PROMO_DOWNLOAD_SUBTITLE_STYLE?.trim() || DEFAULT_SUBTITLE_FORCE_STYLE;
}

function escapeFfmpegFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeFfmpegSubtitlePath(path: string) {
  return escapeFfmpegFilterValue(path).replace(/:/g, "\\:");
}

function buildSubtitleBurnFilter(subtitlePath: string) {
  return `subtitles='${escapeFfmpegSubtitlePath(
    subtitlePath,
  )}':force_style='${escapeFfmpegFilterValue(getSubtitleForceStyle())}'`;
}

export function buildPromoDownloadFfmpegArgs(
  sourceUrl: string,
  outputTarget: string,
  {
    refererOrigin,
    allowAllExtensions = false,
    subtitlePath = null,
    fragmented = false,
  }: {
    refererOrigin: string;
    allowAllExtensions?: boolean;
    subtitlePath?: string | null;
    fragmented?: boolean;
  },
) {
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    FFMPEG_LOG_LEVEL,
    "-nostdin",
    "-protocol_whitelist",
    "file,http,https,tcp,tls,crypto,data",
    "-user_agent",
    FFMPEG_USER_AGENT,
    "-headers",
    `Referer: ${refererOrigin}\r\nOrigin: ${refererOrigin}\r\n`,
    "-i",
    sourceUrl,
    "-map",
    subtitlePath ? "0:v:0" : "0:v:0?",
    "-map",
    "0:a:0?",
  ];

  if (allowAllExtensions) {
    args.splice(7, 0, "-allowed_extensions", "ALL");
  }

  const audioArgs = [
    "-c:a",
    "aac",
    "-profile:a",
    "aac_low",
    "-b:a",
    process.env.PROMO_DOWNLOAD_AUDIO_BITRATE?.trim() || "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
  ];

  if (subtitlePath) {
    args.push(
      "-vf",
      buildSubtitleBurnFilter(subtitlePath),
      "-c:v",
      "libx264",
      "-preset",
      process.env.PROMO_DOWNLOAD_VIDEO_PRESET?.trim() || "veryfast",
      "-crf",
      process.env.PROMO_DOWNLOAD_VIDEO_CRF?.trim() || "20",
      "-pix_fmt",
      "yuv420p",
      ...audioArgs,
    );
  } else {
    args.push("-c:v", "copy", ...audioArgs);
  }

  args.push(
    "-movflags",
    fragmented ? "frag_keyframe+empty_moov+default_base_moof" : "+faststart",
    "-f",
    "mp4",
    outputTarget,
  );

  return args;
}
