#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SUCCESS_ICON = "[ok]";
const ERROR_ICON = "[error]";
const INFO_ICON = "[info]";
const CATALOG_SYNC_READY_BACKOFF_MS = 15_000;

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function bootstrapEnv() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
}

function parseOptionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function createConfig() {
  const baseUrl =
    process.env.WORKER_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  const secret = process.env.CRON_SECRET?.trim() || "";

  if (!baseUrl) {
    throw new Error(
      "WORKER_BASE_URL atau NEXT_PUBLIC_SITE_URL wajib diisi untuk worker.",
    );
  }

  if (!secret) {
    throw new Error("CRON_SECRET wajib diisi untuk worker.");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/u, ""),
    secret,
    catalogSyncRunnerId:
      parseOptionalString(process.env.WORKER_CATALOG_SYNC_RUNNER_ID) ||
      `catalog-sync:${process.env.HOSTNAME || "worker"}:${process.pid}:${Date.now().toString(36)}`,
    catalogSyncIntervalMs: parsePositiveInt(
      process.env.WORKER_CATALOG_SYNC_INTERVAL_MS,
      3000,
    ),
    requestTimeoutMs: parsePositiveInt(
      process.env.WORKER_REQUEST_TIMEOUT_MS,
      120000,
    ),
    notifyTelegramBotToken:
      parseOptionalString(process.env.WORKER_NOTIFY_TELEGRAM_BOT_TOKEN) ||
      parseOptionalString(process.env.TELEGRAM_BOT_TOKEN),
    notifyTelegramChatId: parseOptionalString(
      process.env.WORKER_NOTIFY_TELEGRAM_CHAT_ID,
    ),
    notifyTelegramThreadId: parseOptionalString(
      process.env.WORKER_NOTIFY_TELEGRAM_MESSAGE_THREAD_ID,
    ),
    notifyOnSuccess: parseBoolean(process.env.WORKER_NOTIFY_ON_SUCCESS, true),
    notifyOnFailure: parseBoolean(process.env.WORKER_NOTIFY_ON_FAILURE, true),
  };
}

function nowStamp() {
  return new Date().toISOString();
}

function logInfo(message) {
  console.log(`${INFO_ICON} ${nowStamp()} ${message}`);
}

function logSuccess(message) {
  console.log(`${SUCCESS_ICON} ${nowStamp()} ${message}`);
}

function logError(message) {
  console.error(`${ERROR_ICON} ${nowStamp()} ${message}`);
}

function trimErrorMessage(value, maxLength = 240) {
  const normalized = String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function truncateLines(items, max = 5) {
  return items.slice(0, max);
}

async function sendTelegramNotification(config, lines) {
  if (!config.notifyTelegramBotToken || !config.notifyTelegramChatId) {
    return false;
  }

  const payload = {
    chat_id: config.notifyTelegramChatId,
    text: lines.join("\n"),
    disable_web_page_preview: true,
  };

  if (config.notifyTelegramThreadId) {
    payload.message_thread_id = Number.parseInt(
      config.notifyTelegramThreadId,
      10,
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.notifyTelegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Telegram notify gagal: ${response.status} ${text}`.trim());
  }

  return true;
}

async function notifyIfNeeded(config, input) {
  const hasFailure = input.level === "error";

  if ((hasFailure && !config.notifyOnFailure) || (!hasFailure && !config.notifyOnSuccess)) {
    return;
  }

  try {
    const sent = await sendTelegramNotification(config, input.lines);

    if (sent) {
      logSuccess(`Notifikasi Telegram ${input.name} berhasil dikirim.`);
    }
  } catch (error) {
    logError(
      `Notifikasi Telegram ${input.name} gagal: ${error instanceof Error ? error.message : "Unexpected error"}.`,
    );
  }
}

async function requestJson(config, path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const headers = new Headers(init.headers ?? {});
    headers.set("authorization", `Bearer ${config.secret}`);

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    if (!response.ok) {
      throw new Error(
        trimErrorMessage(
          payload?.error ||
            payload?.detail ||
            payload?.message ||
            payload?.raw ||
            `HTTP ${response.status} ${response.statusText}`.trim(),
        ),
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout untuk ${path}.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForCatalogSyncEndpoint(config) {
  let hasLoggedWaiting = false;

  while (true) {
    try {
      await requestJson(config, "/api/admin/catalog-sync", {
        headers: {
          accept: "application/json",
        },
      });
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";

      if (!hasLoggedWaiting) {
        logInfo(
          `Menunggu endpoint catalog sync siap: ${trimErrorMessage(message, 160)}.`,
        );
        hasLoggedWaiting = true;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, CATALOG_SYNC_READY_BACKOFF_MS);
      });
    }
  }
}

async function refreshCatalogCache(config) {
  const result = await requestJson(config, "/api/admin/catalog-cache/refresh", {
    method: "POST",
  });
  logSuccess(result.message || "Cache homepage berhasil direfresh.");
  return result;
}

function createCatalogSyncLogger() {
  let lastSignature = null;

  return function logCatalogSyncState(syncJob) {
    if (!syncJob) {
      if (lastSignature !== "idle") {
        logInfo("Catalog sync idle. Tidak ada job aktif.");
        lastSignature = "idle";
      }
      return;
    }

    const signature = [
      syncJob.id,
      syncJob.status,
      syncJob.phase,
      syncJob.currentPlatformId || "",
      syncJob.currentTabName || "",
      syncJob.lastMessage || "",
      syncJob.updatedAt || "",
    ].join("|");

    if (signature === lastSignature) {
      return;
    }

    const scope = [
      syncJob.currentPlatformId,
      syncJob.currentTabName,
    ]
      .filter(Boolean)
      .join(" / ");
    const prefix = scope ? `${scope}: ` : "";

    if (syncJob.status === "failed") {
      logError(`Catalog sync ${prefix}${syncJob.lastMessage || "job gagal."}`);
    } else if (
      syncJob.status === "completed" ||
      syncJob.status === "cancelled"
    ) {
      logSuccess(`Catalog sync ${prefix}${syncJob.lastMessage || syncJob.status}.`);
    } else {
      logInfo(
        `Catalog sync ${prefix}${syncJob.lastMessage || syncJob.status} (${syncJob.progressPercent ?? 0}%).`,
      );
    }

    lastSignature = signature;
  };
}

const logCatalogSyncState = createCatalogSyncLogger();

function formatCatalogSyncDuration(syncJob) {
  const startedAt = syncJob?.startedAt ? Date.parse(syncJob.startedAt) : NaN;
  const endedAt =
    syncJob?.finishedAt
      ? Date.parse(syncJob.finishedAt)
      : syncJob?.updatedAt
        ? Date.parse(syncJob.updatedAt)
        : Date.now();

  if (Number.isNaN(startedAt) || Number.isNaN(endedAt) || endedAt < startedAt) {
    return "n/a";
  }

  return `${Math.round((endedAt - startedAt) / 1000)} detik`;
}

function createCatalogSyncNotifier() {
  let lastNotifiedSignature = null;

  return async function notifyCatalogSyncState(config, syncJob) {
    if (!syncJob) {
      return;
    }

    const isFinalStatus = ["completed", "failed", "cancelled"].includes(
      syncJob.status,
    );

    if (!isFinalStatus) {
      return;
    }

    const signature = [
      syncJob.id,
      syncJob.status,
      syncJob.finishedAt || "",
      syncJob.updatedAt || "",
      syncJob.errorCount ?? 0,
    ].join("|");

    if (signature === lastNotifiedSignature) {
      return;
    }

    lastNotifiedSignature = signature;

    const recentErrors = Array.isArray(syncJob.recentErrors)
      ? syncJob.recentErrors
          .map((item) => item?.message)
          .filter(Boolean)
      : [];

    await notifyIfNeeded(config, {
      name: "catalog-sync",
      level: syncJob.status === "failed" ? "error" : "success",
      lines: [
        syncJob.status === "failed"
          ? "Catalog sync gagal"
          : syncJob.status === "cancelled"
            ? "Catalog sync dibatalkan"
            : "Catalog sync selesai",
        "",
        `Base URL: ${config.baseUrl}`,
        `Job ID: ${syncJob.id}`,
        `Status: ${syncJob.status}`,
        `Phase: ${syncJob.phase}`,
        `Platform: ${syncJob.currentPlatformId || "-"}`,
        `Progress: ${syncJob.progressPercent ?? 0}%`,
        `Provider selesai: ${syncJob.completedPlatforms}/${syncJob.totalPlatforms}`,
        `Tab selesai: ${syncJob.completedTabs}/${syncJob.totalTabs}`,
        `Total judul: ${syncJob.totalTitles}`,
        `Total episode: ${syncJob.totalEpisodes}`,
        `Pending audit: ${syncJob.pendingDetails}`,
        `Processed audit: ${syncJob.processedDetails}`,
        `Errors: ${syncJob.errorCount}`,
        `Durasi: ${formatCatalogSyncDuration(syncJob)}`,
        `Pesan: ${syncJob.lastMessage || "-"}`,
        ...(recentErrors.length > 0
          ? ["", "Error utama:", ...truncateLines(recentErrors).map((item) => `- ${item}`)]
          : []),
      ],
    });
  };
}

const notifyCatalogSyncState = createCatalogSyncNotifier();

async function runCatalogSyncStepOnce(config) {
  const payload = await requestJson(config, "/api/admin/catalog-sync", {
    method: "POST",
    body: JSON.stringify({
      mode: "run-sync-all-step",
      runnerId: config.catalogSyncRunnerId,
    }),
  });

  const syncJob = payload?.syncJob ?? null;
  logCatalogSyncState(syncJob);
  await notifyCatalogSyncState(config, syncJob);
  return syncJob;
}

function createLoopRunner(name, intervalMs, task) {
  let running = false;
  let timer = null;

  async function tick() {
    if (running) {
      logInfo(`Loop ${name} dilewati karena proses sebelumnya masih berjalan.`);
      timer = setTimeout(tick, intervalMs);
      return;
    }

    running = true;

    try {
      await task();
    } catch (error) {
      logError(
        `Loop ${name} gagal: ${error instanceof Error ? error.message : "Unexpected error"}.`,
      );
    } finally {
      running = false;
      timer = setTimeout(tick, intervalMs);
    }
  }

  return {
    start() {
      timer = setTimeout(tick, intervalMs);
    },
    stop() {
      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}

async function runCatalogSyncLoop(config) {
  logInfo(
    `Catalog sync worker aktif. interval=${config.catalogSyncIntervalMs}ms runner=${config.catalogSyncRunnerId}.`,
  );
  await waitForCatalogSyncEndpoint(config);
  logSuccess("Endpoint catalog sync siap. Worker mulai polling job.");

  const catalogSyncLoop = createLoopRunner(
    "catalog-sync",
    config.catalogSyncIntervalMs,
    () => runCatalogSyncStepOnce(config),
  );

  try {
    await runCatalogSyncStepOnce(config);
  } catch (error) {
    logError(
      `Catalog sync startup gagal: ${error instanceof Error ? error.message : "Unexpected error"}.`,
    );
  }
  catalogSyncLoop.start();

  const shutdown = (signal) => {
    logInfo(`Menerima ${signal}, menghentikan catalog sync worker.`);
    catalogSyncLoop.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main() {
  bootstrapEnv();

  const config = createConfig();
  const command = (process.argv[2] || "catalog-sync").trim().toLowerCase();

  if (command === "refresh") {
    await refreshCatalogCache(config);
    return;
  }

  if (command === "catalog-sync-once") {
    await runCatalogSyncStepOnce(config);
    return;
  }

  if (
    command === "catalog-sync" ||
    command === "catalog-sync-worker" ||
    command === "scheduler"
  ) {
    await runCatalogSyncLoop(config);
    return;
  }

  console.log(`Unknown command: ${command}`);
  console.log(
    "Available commands: scheduler, refresh, catalog-sync, catalog-sync-once",
  );
  process.exitCode = 1;
}

await main().catch((error) => {
  logError(error instanceof Error ? error.message : "Worker gagal dijalankan.");
  process.exit(1);
});
