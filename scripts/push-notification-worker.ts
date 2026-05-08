import { randomUUID } from "node:crypto";

import { processPushNotificationBatch } from "@/lib/push-notifications";

const workerId = `${process.env.HOSTNAME || "local"}:${process.pid}:${randomUUID().slice(0, 8)}`;
const idleMs = Number.parseInt(process.env.PUSH_NOTIFICATION_IDLE_MS || "3000", 10);
const batchSize = Number.parseInt(process.env.PUSH_NOTIFICATION_BATCH_SIZE || "100", 10);

let shouldStop = false;

function log(message: string, meta?: unknown) {
  console.log(
    `[push-notification:${workerId}] ${message}${
      meta ? `\n${JSON.stringify(meta)}` : ""
    }`,
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

process.on("SIGINT", () => {
  shouldStop = true;
});

process.on("SIGTERM", () => {
  shouldStop = true;
});

async function main() {
  log("Worker started.", {
    batchSize,
    idleMs,
  });

  while (!shouldStop) {
    try {
      const result = await processPushNotificationBatch(batchSize);

      if (result.disabled) {
        log("VAPID key belum dikonfigurasi. Worker idle.");
        await sleep(Math.max(idleMs, 10_000));
        continue;
      }

      if (result.processed > 0) {
        log(`Processed ${result.processed} delivery.`);
        continue;
      }
    } catch (error) {
      log("Batch gagal diproses.", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await sleep(idleMs);
  }

  log("Worker stopped.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
