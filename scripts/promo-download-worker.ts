import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const WORKER_IDLE_MS = Number.parseInt(
  process.env.PROMO_DOWNLOAD_IDLE_MS?.trim() || "3000",
  10,
);

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  const {
    buildPromoDownloadWorkerId,
    claimPromoDownloadJob,
    completePromoDownloadJob,
    failPromoDownloadJob,
    processPromoDownloadJob,
  } = await import("../lib/promo-download");
  const { prisma } = await import("../lib/prisma");

  const workerId = buildPromoDownloadWorkerId();
  let shouldStop = false;

  async function shutdown(signal: string) {
    shouldStop = true;
    console.warn(`[${workerId}] menerima ${signal}, menghentikan worker download promo.`);
    await prisma.$disconnect().catch(() => undefined);
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  console.info(`[${workerId}] Promo download worker aktif.`);

  while (!shouldStop) {
    const job = await claimPromoDownloadJob(workerId);

    if (!job) {
      await sleep(Number.isFinite(WORKER_IDLE_MS) ? Math.max(500, WORKER_IDLE_MS) : 3000);
      continue;
    }

    try {
      console.info(`[${workerId}] Download EP.${job.episodeIndex} series=${job.seriesId}`);
      const result = await processPromoDownloadJob(job);
      await completePromoDownloadJob(job.id, result);
      console.info(
        `[${workerId}] Selesai EP.${job.episodeIndex} ${result.fileSizeBytes} bytes (${result.sourceType})`,
      );
    } catch (error) {
      await failPromoDownloadJob(job, error);
      console.error(
        `[${workerId}] Gagal EP.${job.episodeIndex}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
