import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, rename, stat, unlink } from "node:fs/promises";
import { hostname } from "node:os";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { ensureSeriesPlayableFresh } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { signPromoDownloadUrl } from "@/lib/promo-download-links";
import {
  buildPromoDownloadFfmpegArgs,
  createNormalizedSubtitleTempFile,
  CURRENT_PROMO_DOWNLOAD_OUTPUT_VERSION,
  FFMPEG_USER_AGENT,
  PROMO_DOWNLOAD_SUBTITLE_MODE,
  removePromoSubtitleTempFile,
  type PromoDownloadSubtitleStatus,
} from "@/lib/promo-download-rendering";
import { resolveDramaStreamSources } from "@/lib/stream-access";
import { findIndonesianSubtitle } from "@/lib/subtitles";

export const PROMO_DOWNLOAD_STATUSES = [
  "queued",
  "processing",
  "done",
  "failed",
] as const;

type PromoDownloadStatus = (typeof PROMO_DOWNLOAD_STATUSES)[number];

export type PromoDownloadJobRow = {
  id: string;
  seriesId: string;
  episodeIndex: number;
  status: PromoDownloadStatus;
  sourceType: string;
  qualityLabel: string;
  outputPath: string;
  fileSizeBytes: bigint | number | null;
  outputVersion: number;
  subtitleMode: string;
  subtitleStatus: string;
  subtitleLabel: string;
  subtitleLanguage: string;
  error: string;
  attempts: number;
  maxAttempts: number;
  workerId: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PromoDownloadProcessResult = {
  outputPath: string;
  fileSizeBytes: number;
  sourceType: "mp4" | "hls";
  qualityLabel: string;
  outputVersion: number;
  subtitleMode: typeof PROMO_DOWNLOAD_SUBTITLE_MODE;
  subtitleStatus: PromoDownloadSubtitleStatus;
  subtitleLabel: string;
  subtitleLanguage: string;
};

const FFMPEG_PATH = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
const MIN_FREE_MB = Number.parseInt(
  process.env.PROMO_DOWNLOAD_MIN_FREE_MB?.trim() || "1024",
  10,
);
const MIN_DURATION_SECONDS = Number.parseInt(
  process.env.PROMO_DOWNLOAD_MIN_DURATION_SECONDS?.trim() || "15",
  10,
);
const MIN_VALID_FILE_BYTES = 128 * 1024;

function getWorkerBaseUrl() {
  const explicitUrl =
    process.env.WORKER_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/u, "");
  }

  return `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`;
}

function getDownloadRoot() {
  return resolve(process.cwd(), process.env.PROMO_DOWNLOAD_DIR?.trim() || "storage/promo-downloads");
}

function toAbsoluteUrl(url: string) {
  return new URL(url, getWorkerBaseUrl()).toString();
}

function outputPathForEpisode(seriesId: string, episodeIndex: number) {
  const filename = `EP-${String(episodeIndex).padStart(3, "0")}.mp4`;
  return resolve(getDownloadRoot(), seriesId, filename);
}

function toStoredOutputPath(absolutePath: string) {
  return relative(process.cwd(), absolutePath);
}

function resolveStoredOutputPath(outputPath: string) {
  const root = getDownloadRoot();
  const absolutePath = resolve(process.cwd(), outputPath);
  const relativeToRoot = relative(root, absolutePath);

  if (
    relativeToRoot.startsWith("..") ||
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${sep}`) ||
    absolutePath === root
  ) {
    throw new Error("Invalid promo download output path.");
  }

  return absolutePath;
}

function numberFromBigInt(value: bigint | number | null) {
  if (typeof value === "bigint") return Number(value);
  return value;
}

function normalizeStoredSubtitleStatus(status: string): PromoDownloadSubtitleStatus {
  return status === "burned" ? "burned" : "missing";
}

function serializeJob(job: PromoDownloadJobRow) {
  return {
    ...job,
    fileSizeBytes: numberFromBigInt(job.fileSizeBytes),
    downloadUrl:
      job.status === "done"
        ? signPromoDownloadUrl(
            `/api/admin/promo-download/file?jobId=${encodeURIComponent(job.id)}`,
          )
        : null,
  };
}

async function readSeriesDownloadInfo(seriesId: string) {
  return prisma.catalogSeries.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      title: true,
      platformId: true,
      chapterCount: true,
      episodes: {
        select: { episodeIndex: true },
        orderBy: { episodeIndex: "asc" },
      },
    },
  });
}

function inferEpisodeCount(series: NonNullable<Awaited<ReturnType<typeof readSeriesDownloadInfo>>>) {
  const highestEpisode = series.episodes.reduce(
    (highest, episode) => Math.max(highest, episode.episodeIndex),
    0,
  );

  return Math.max(series.chapterCount, highestEpisode);
}

export async function getPromoDownloadSummary(seriesId: string) {
  const series = await readSeriesDownloadInfo(seriesId);

  if (!series) {
    return null;
  }

  const jobs = await prisma.$queryRaw<PromoDownloadJobRow[]>`
    select *
    from "PromoDownloadJob"
    where "seriesId" = ${seriesId}::uuid
    order by "episodeIndex" asc
  `;
  const counts = jobs.reduce(
    (accumulator, job) => {
      accumulator[job.status] += 1;
      return accumulator;
    },
    { queued: 0, processing: 0, done: 0, failed: 0 } satisfies Record<PromoDownloadStatus, number>,
  );

  return {
    dramaId: series.id,
    title: series.title,
    provider: series.platformId,
    episodeCount: inferEpisodeCount(series),
    counts,
    jobs: jobs.map(serializeJob),
  };
}

async function requeueInvalidOrOutdatedDoneJobs(seriesId: string) {
  const doneJobs = await prisma.$queryRaw<PromoDownloadJobRow[]>`
    select *
    from "PromoDownloadJob"
    where "seriesId" = ${seriesId}::uuid
      and "status" = 'done'
    order by "episodeIndex" asc
  `;

  for (const job of doneJobs) {
    let absolutePath = "";
    let isUsable = false;
    const isOutdated =
      job.outputVersion < CURRENT_PROMO_DOWNLOAD_OUTPUT_VERSION;

    if (job.outputPath) {
      try {
        absolutePath = resolveStoredOutputPath(job.outputPath);
        isUsable = await hasUsableOutput(absolutePath);
      } catch {
        isUsable = false;
      }
    }

    if (!isOutdated && isUsable) {
      continue;
    }

    if (absolutePath) {
      await unlink(absolutePath).catch(() => undefined);
    }

    await prisma.$executeRaw`
      update "PromoDownloadJob"
      set
        "status" = 'queued',
        "outputPath" = '',
        "fileSizeBytes" = null,
        "outputVersion" = 1,
        "subtitleMode" = '',
        "subtitleStatus" = '',
        "subtitleLabel" = '',
        "subtitleLanguage" = '',
        "error" = '',
        "attempts" = 0,
        "scheduledAt" = now(),
        "startedAt" = null,
        "finishedAt" = null,
        "updatedAt" = now()
      where "id" = ${job.id}::uuid
    `;
  }
}

export async function enqueuePromoDownloadAll(seriesId: string) {
  let series = await readSeriesDownloadInfo(seriesId);

  if (!series) {
    throw new Error("Drama tidak ditemukan.");
  }

  if (inferEpisodeCount(series) === 0) {
    await ensureSeriesPlayableFresh(seriesId, {
      allowStaleOnFailure: true,
      force: true,
    });
    series = await readSeriesDownloadInfo(seriesId);
  }

  if (!series) {
    throw new Error("Drama tidak ditemukan.");
  }

  const episodeCount = inferEpisodeCount(series);

  if (episodeCount <= 0) {
    throw new Error("Episode belum tersedia untuk drama ini.");
  }

  await requeueInvalidOrOutdatedDoneJobs(seriesId);

  for (let episodeIndex = 1; episodeIndex <= episodeCount; episodeIndex += 1) {
    await prisma.$executeRaw`
      insert into "PromoDownloadJob" ("seriesId", "episodeIndex", "status", "scheduledAt", "updatedAt")
      values (${seriesId}::uuid, ${episodeIndex}, 'queued', now(), now())
      on conflict ("seriesId", "episodeIndex") do update set
        "status" = case
          when "PromoDownloadJob"."status" in ('done', 'processing') then "PromoDownloadJob"."status"
          else 'queued'
        end,
        "error" = case
          when "PromoDownloadJob"."status" in ('done', 'processing') then "PromoDownloadJob"."error"
          else ''
        end,
        "attempts" = case
          when "PromoDownloadJob"."status" in ('done', 'processing') then "PromoDownloadJob"."attempts"
          else 0
        end,
        "scheduledAt" = case
          when "PromoDownloadJob"."status" in ('done', 'processing') then "PromoDownloadJob"."scheduledAt"
          else now()
        end,
        "updatedAt" = now()
    `;
  }

  return getPromoDownloadSummary(seriesId);
}

export async function claimPromoDownloadJob(workerId: string) {
  const jobs = await prisma.$queryRaw<PromoDownloadJobRow[]>`
    update "PromoDownloadJob"
    set
      "status" = 'processing',
      "workerId" = ${workerId},
      "attempts" = "attempts" + 1,
      "startedAt" = now(),
      "updatedAt" = now()
    where "id" = (
      select "id"
      from "PromoDownloadJob"
      where "status" = 'queued'
        and "scheduledAt" <= now()
      order by "scheduledAt" asc, "createdAt" asc
      for update skip locked
      limit 1
    )
    returning *
  `;

  return jobs[0] ?? null;
}

export async function completePromoDownloadJob(
  jobId: string,
  result: PromoDownloadProcessResult,
) {
  await prisma.$executeRaw`
    update "PromoDownloadJob"
    set
      "status" = 'done',
      "sourceType" = ${result.sourceType},
      "qualityLabel" = ${result.qualityLabel},
      "outputPath" = ${result.outputPath},
      "fileSizeBytes" = ${result.fileSizeBytes},
      "outputVersion" = ${result.outputVersion},
      "subtitleMode" = ${result.subtitleMode},
      "subtitleStatus" = ${result.subtitleStatus},
      "subtitleLabel" = ${result.subtitleLabel},
      "subtitleLanguage" = ${result.subtitleLanguage},
      "error" = '',
      "finishedAt" = now(),
      "updatedAt" = now()
    where "id" = ${jobId}::uuid
  `;
}

export async function failPromoDownloadJob(job: PromoDownloadJobRow, error: unknown) {
  const message = error instanceof Error ? error.message : "Download promo gagal.";
  const shouldRetry = job.attempts < job.maxAttempts;
  const retryDelaySeconds = Math.min(900, Math.max(30, job.attempts * job.attempts * 30));
  const nextSchedule = new Date(Date.now() + retryDelaySeconds * 1000);

  await prisma.$executeRaw`
    update "PromoDownloadJob"
    set
      "status" = ${shouldRetry ? "queued" : "failed"},
      "error" = ${message.slice(0, 1000)},
      "scheduledAt" = ${shouldRetry ? nextSchedule : job.scheduledAt},
      "finishedAt" = ${shouldRetry ? null : new Date()},
      "updatedAt" = now()
    where "id" = ${job.id}::uuid
  `;
}

function assertFfmpegAvailable() {
  const result = spawnSync(FFMPEG_PATH, ["-version"], {
    stdio: "ignore",
    timeout: 3_000,
  });

  if (result.error || result.status !== 0) {
    throw new Error("FFmpeg belum tersedia. Install ffmpeg atau set FFMPEG_PATH.");
  }
}

async function assertEnoughDiskSpace() {
  const root = getDownloadRoot();
  await mkdir(root, { recursive: true });

  const result = spawnSync("df", ["-Pk", root], {
    encoding: "utf8",
    timeout: 3_000,
  });

  if (result.error || result.status !== 0) {
    return;
  }

  const line = result.stdout.trim().split(/\r?\n/u).at(-1);
  const availableKb = Number.parseInt(line?.trim().split(/\s+/u)[3] ?? "", 10);

  if (!Number.isFinite(availableKb)) {
    return;
  }

  const availableMb = availableKb / 1024;
  const requiredMb = Number.isFinite(MIN_FREE_MB) ? Math.max(256, MIN_FREE_MB) : 1024;

  if (availableMb < requiredMb) {
    throw new Error(`Sisa disk ${availableMb.toFixed(0)} MB, minimal ${requiredMb} MB.`);
  }
}

function runFfmpeg(
  sourceUrl: string,
  outputPath: string,
  subtitlePath: string | null,
) {
  return new Promise<void>((resolvePromise, reject) => {
    const ffmpeg = spawn(
      FFMPEG_PATH,
      buildPromoDownloadFfmpegArgs(sourceUrl, outputPath, {
        refererOrigin: getWorkerBaseUrl(),
        allowAllExtensions: sourceUrl.toLowerCase().includes("m3u8"),
        subtitlePath,
      }),
      {
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    let stderr = "";

    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-4_000);
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(stderr || `FFmpeg keluar dengan kode ${code}.`));
    });
  });
}

async function downloadMp4(sourceUrl: string, outputPath: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "*/*",
      "User-Agent": FFMPEG_USER_AGENT,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30 * 60 * 1000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Download MP4 gagal dengan status ${response.status}.`);
  }

  const body = response.body as unknown as Parameters<typeof Readable.fromWeb>[0];
  await pipeline(Readable.fromWeb(body), createWriteStream(outputPath));
}

async function hasUsableOutput(path: string) {
  try {
    const stats = await stat(path);
    if (!stats.isFile() || stats.size < MIN_VALID_FILE_BYTES) {
      return false;
    }

    const duration = readVideoDurationSeconds(path);

    if (duration === null) {
      return true;
    }

    const requiredDuration = Number.isFinite(MIN_DURATION_SECONDS)
      ? Math.max(1, MIN_DURATION_SECONDS)
      : 15;

    return duration >= requiredDuration;
  } catch {
    return false;
  }
}

function readVideoDurationSeconds(path: string) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ],
    {
      encoding: "utf8",
      timeout: 5_000,
    },
  );

  if (result.error || result.status !== 0) {
    return null;
  }

  const parsed = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function isPlaceholderStreamUrl(url: string) {
  const normalizedUrl = url.toLowerCase();
  return (
    normalizedUrl.includes("/image/not_found.mp4") ||
    normalizedUrl.includes("not_found.mp4") ||
    normalizedUrl.includes("404.mp4")
  );
}

function pickQuality(
  qualities: Array<{ label: string; url: string; mimeType: "application/x-mpegURL" | "video/mp4" }>,
) {
  const usableQualities = qualities.filter((quality) => !isPlaceholderStreamUrl(quality.url));
  const hls = usableQualities.find((quality) => quality.mimeType === "application/x-mpegURL");
  const mp4 = usableQualities.find((quality) => quality.mimeType === "video/mp4");

  return hls ?? mp4 ?? null;
}

export async function processPromoDownloadJob(job: PromoDownloadJobRow) {
  await assertEnoughDiskSpace();

  const outputPath = outputPathForEpisode(job.seriesId, job.episodeIndex);
  const tempPath = `${outputPath}.${process.pid}.partial.mp4`;
  await mkdir(dirname(outputPath), { recursive: true });

  if (
    job.outputVersion >= CURRENT_PROMO_DOWNLOAD_OUTPUT_VERSION &&
    (await hasUsableOutput(outputPath))
  ) {
    const stats = await stat(outputPath);
    return {
      outputPath: toStoredOutputPath(outputPath),
      fileSizeBytes: stats.size,
      sourceType: job.sourceType === "mp4" ? "mp4" : "hls",
      qualityLabel: job.qualityLabel || "existing",
      outputVersion: CURRENT_PROMO_DOWNLOAD_OUTPUT_VERSION,
      subtitleMode: PROMO_DOWNLOAD_SUBTITLE_MODE,
      subtitleStatus: normalizeStoredSubtitleStatus(job.subtitleStatus),
      subtitleLabel: job.subtitleLabel,
      subtitleLanguage: job.subtitleLanguage,
    } satisfies PromoDownloadProcessResult;
  }

  await unlink(tempPath).catch(() => undefined);

  let resolved = await resolveDramaStreamSources({
    internalDramaId: job.seriesId,
    episodeIndex: job.episodeIndex,
    bypassVipLock: true,
  });
  let quality = pickQuality(resolved.stream.qualities);

  if (!quality) {
    await ensureSeriesPlayableFresh(job.seriesId, {
      allowStaleOnFailure: false,
      force: true,
      hideOnFailure: true,
    });
    resolved = await resolveDramaStreamSources({
      internalDramaId: job.seriesId,
      episodeIndex: job.episodeIndex,
      bypassVipLock: true,
    });
    quality = pickQuality(resolved.stream.qualities);
  }

  if (!quality) {
    throw new Error("Source stream tidak tersedia atau masih mengarah ke placeholder 404.");
  }

  const sourceUrl = toAbsoluteUrl(quality.url);
  const sourceType = quality.mimeType === "video/mp4" ? "mp4" : "hls";
  const subtitle = findIndonesianSubtitle(resolved.stream.subtitles);
  const subtitleStatus: PromoDownloadSubtitleStatus = subtitle ? "burned" : "missing";
  let subtitleTempFile: { directory: string; path: string } | null = null;

  try {
    if (subtitle) {
      subtitleTempFile = await createNormalizedSubtitleTempFile(
        toAbsoluteUrl(subtitle.url),
      );
    }

    if (sourceType === "hls" || subtitleTempFile) {
      assertFfmpegAvailable();
      await runFfmpeg(sourceUrl, tempPath, subtitleTempFile?.path ?? null);
    } else {
      await downloadMp4(sourceUrl, tempPath);
    }
  } finally {
    await removePromoSubtitleTempFile(subtitleTempFile);
  }

  const stats = await stat(tempPath);

  if (stats.size < MIN_VALID_FILE_BYTES) {
    await unlink(tempPath).catch(() => undefined);
    throw new Error(`File hasil terlalu kecil (${stats.size} bytes).`);
  }

  await rename(tempPath, outputPath);

  return {
    outputPath: toStoredOutputPath(outputPath),
    fileSizeBytes: stats.size,
    sourceType,
    qualityLabel: quality.label,
    outputVersion: CURRENT_PROMO_DOWNLOAD_OUTPUT_VERSION,
    subtitleMode: PROMO_DOWNLOAD_SUBTITLE_MODE,
    subtitleStatus,
    subtitleLabel: subtitle?.label ?? "",
    subtitleLanguage: subtitle?.language ?? "",
  } satisfies PromoDownloadProcessResult;
}

export async function getPromoDownloadFile(jobId: string) {
  const jobs = await prisma.$queryRaw<
    Array<
      PromoDownloadJobRow & {
        title: string;
      }
    >
  >`
    select j.*, s."title"
    from "PromoDownloadJob" j
    join "CatalogSeries" s on s."id" = j."seriesId"
    where j."id" = ${jobId}::uuid
    limit 1
  `;
  const job = jobs[0];

  if (!job || job.status !== "done" || !job.outputPath) {
    return null;
  }

  const absolutePath = resolveStoredOutputPath(job.outputPath);
  await access(absolutePath);
  const stats = await stat(absolutePath);

  return {
    absolutePath,
    filename: `${job.title.replace(/[^\w\s.-]+/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "promo"}-EP-${String(job.episodeIndex).padStart(3, "0")}.mp4`,
    size: stats.size,
    basename: basename(absolutePath),
  };
}

export function buildPromoDownloadWorkerId() {
  return `promo-download:${hostname()}:${process.pid}:${Date.now().toString(36)}`;
}
