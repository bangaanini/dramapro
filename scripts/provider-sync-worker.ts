import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
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
  process.env.PROVIDER_SYNC_IDLE_MS?.trim() || "3000",
  10,
);

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  const {
    claimProviderSyncJob,
    completeProviderSyncJob,
    failProviderSyncJob,
    logProviderWorker,
    processProviderSyncJob,
  } = await import("../lib/provider-sync");
  const { prisma } = await import("../lib/prisma");

  const workerId = `provider-sync:${hostname()}:${process.pid}:${Date.now().toString(36)}`;
  let shouldStop = false;

  async function shutdown(signal: string) {
    shouldStop = true;
    await logProviderWorker({
      workerId,
      level: "warn",
      message: `Provider sync worker menerima ${signal}, menghentikan loop.`,
    }).catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await logProviderWorker({
    workerId,
    level: "info",
    message: "Provider sync worker aktif.",
  });
  console.info(`[${workerId}] Provider sync worker aktif.`);

  while (!shouldStop) {
    const job = await claimProviderSyncJob(workerId);

    if (!job) {
      await sleep(Number.isFinite(WORKER_IDLE_MS) ? Math.max(500, WORKER_IDLE_MS) : 3000);
      continue;
    }

    try {
      const count = await processProviderSyncJob(job, workerId);
      await completeProviderSyncJob(job.id);
      await logProviderWorker({
        workerId,
        jobId: job.id,
        level: "info",
        message: `Job ${job.id} selesai. processed=${count ?? 0}`,
      });
      console.info(`[${workerId}] Job ${job.id} selesai. processed=${count ?? 0}`);
    } catch (error) {
      await failProviderSyncJob(job, error);
      await logProviderWorker({
        workerId,
        jobId: job.id,
        level: "error",
        message:
          error instanceof Error
            ? `Job ${job.id} gagal: ${error.message}`
            : `Job ${job.id} gagal.`,
      });
      console.error(error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
