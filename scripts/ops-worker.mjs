#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_PROVIDERS = [
  "melolo",
  "meloshort",
  "goodshort",
  "dramawave",
  "dramabox",
  "reelshort",
  "freereels",
  "flickreels",
  "netshort",
];

const DEFAULT_SOURCES = ["home", "new", "popular"];
const SUCCESS_ICON = "[ok]";
const ERROR_ICON = "[error]";
const INFO_ICON = "[info]";

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

function parseCsv(value, fallback) {
  const normalized = String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : fallback;
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
    providers: parseCsv(process.env.WORKER_PROVIDERS, DEFAULT_PROVIDERS),
    sources: parseCsv(process.env.WORKER_SOURCES, DEFAULT_SOURCES),
    pages: parsePositiveInt(process.env.WORKER_SYNC_PAGES, 2),
    auditBatchSize: parsePositiveInt(process.env.WORKER_AUDIT_BATCH_SIZE, 10),
    syncIntervalMinutes: parsePositiveInt(
      process.env.WORKER_SYNC_INTERVAL_MINUTES,
      30,
    ),
    auditIntervalMinutes: parsePositiveInt(
      process.env.WORKER_AUDIT_INTERVAL_MINUTES,
      60,
    ),
    requestTimeoutMs: parsePositiveInt(
      process.env.WORKER_REQUEST_TIMEOUT_MS,
      120000,
    ),
    refreshAfterRun: parseBoolean(process.env.WORKER_REFRESH_AFTER_RUN, true),
    syncOnStart: parseBoolean(process.env.WORKER_SYNC_ON_START, true),
    auditOnStart: parseBoolean(process.env.WORKER_AUDIT_ON_START, false),
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
        payload?.error ||
          payload?.detail ||
          payload?.message ||
          payload?.raw ||
          `HTTP ${response.status} ${response.statusText}`.trim(),
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

async function refreshCatalogCache(config) {
  const result = await requestJson(config, "/api/admin/catalog-cache/refresh", {
    method: "POST",
  });
  logSuccess(result.message || "Cache homepage berhasil direfresh.");
  return result;
}

async function runSyncOnce(config) {
  const startedAt = Date.now();
  let processed = 0;
  let hidden = 0;
  let errors = 0;

  logInfo(
    `Memulai sync worker untuk ${config.sources.join(", ")} page 1-${config.pages}.`,
  );

  for (const source of config.sources) {
    for (let page = 1; page <= config.pages; page += 1) {
      for (const provider of config.providers) {
        const query = new URLSearchParams({
          provider,
          page: String(page),
          source,
        });

        try {
          const result = await requestJson(
            config,
            `/api/cron/sync?${query.toString()}`,
          );

          processed += Number(result?.processed ?? 0);
          hidden += Number(result?.hidden ?? 0);
          errors += Array.isArray(result?.errors) ? result.errors.length : 0;

          logSuccess(
            `Sync ${provider} ${source} page ${page}: processed=${result.processed}, created=${result.created}, updated=${result.updated}, hidden=${result.hidden}, skipped=${result.skipped}, errors=${Array.isArray(result.errors) ? result.errors.length : 0}.`,
          );
        } catch (error) {
          errors += 1;
          logError(
            `Sync ${provider} ${source} page ${page} gagal: ${error instanceof Error ? error.message : "Unexpected error"}.`,
          );
        }
      }
    }
  }

  if (config.refreshAfterRun) {
    await refreshCatalogCache(config).catch((error) => {
      logError(
        `Refresh cache setelah sync gagal: ${error instanceof Error ? error.message : "Unexpected error"}.`,
      );
    });
  }

  logSuccess(
    `Sync worker selesai dalam ${Math.round((Date.now() - startedAt) / 1000)} detik. processed=${processed}, hidden=${hidden}, errors=${errors}.`,
  );
}

async function runAuditSource(config, source) {
  let cursor = null;
  let batch = 0;
  let totalChecked = 0;
  let totalHidden = 0;
  let totalRestored = 0;
  let totalErrors = 0;

  while (true) {
    batch += 1;
    const result = await requestJson(config, "/api/admin/drama-stream-audit", {
      method: "POST",
      body: JSON.stringify({
        source,
        cursor,
        batchSize: config.auditBatchSize,
      }),
    });

    totalChecked += Number(result?.checked ?? 0);
    totalHidden += Number(result?.hidden ?? 0);
    totalRestored += Number(result?.restored ?? 0);
    totalErrors += Array.isArray(result?.errors) ? result.errors.length : 0;

    logSuccess(
      `Audit ${source} batch ${batch}: checked=${result.checked}, hidden=${result.hidden}, restored=${result.restored}, alreadyHidden=${result.alreadyHidden}, errors=${Array.isArray(result.errors) ? result.errors.length : 0}, hasMore=${result.hasMore}.`,
    );

    if (!result?.hasMore || !result?.nextCursor) {
      return {
        checked: totalChecked,
        hidden: totalHidden,
        restored: totalRestored,
        errors: totalErrors,
      };
    }

    cursor = result.nextCursor;
  }
}

async function runAuditOnce(config) {
  const startedAt = Date.now();
  let checked = 0;
  let hidden = 0;
  let restored = 0;
  let errors = 0;

  logInfo(`Memulai audit worker untuk ${config.sources.join(", ")}.`);

  for (const source of config.sources) {
    try {
      const result = await runAuditSource(config, source);
      checked += result.checked;
      hidden += result.hidden;
      restored += result.restored;
      errors += result.errors;
    } catch (error) {
      errors += 1;
      logError(
        `Audit ${source} gagal: ${error instanceof Error ? error.message : "Unexpected error"}.`,
      );
    }
  }

  if (config.refreshAfterRun) {
    await refreshCatalogCache(config).catch((error) => {
      logError(
        `Refresh cache setelah audit gagal: ${error instanceof Error ? error.message : "Unexpected error"}.`,
      );
    });
  }

  logSuccess(
    `Audit worker selesai dalam ${Math.round((Date.now() - startedAt) / 1000)} detik. checked=${checked}, hidden=${hidden}, restored=${restored}, errors=${errors}.`,
  );
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

async function runScheduler(config) {
  logInfo(
    `Scheduler aktif. sync=${config.syncIntervalMinutes}m, audit=${config.auditIntervalMinutes}m.`,
  );

  if (config.syncOnStart) {
    await runSyncOnce(config);
  }

  if (config.auditOnStart) {
    await runAuditOnce(config);
  }

  const syncLoop = createLoopRunner(
    "sync",
    config.syncIntervalMinutes * 60 * 1000,
    () => runSyncOnce(config),
  );
  const auditLoop = createLoopRunner(
    "audit",
    config.auditIntervalMinutes * 60 * 1000,
    () => runAuditOnce(config),
  );

  syncLoop.start();
  auditLoop.start();

  const shutdown = (signal) => {
    logInfo(`Menerima ${signal}, menghentikan scheduler worker.`);
    syncLoop.stop();
    auditLoop.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main() {
  bootstrapEnv();

  const config = createConfig();
  const command = (process.argv[2] || "scheduler").trim().toLowerCase();

  if (command === "sync" || command === "sync-once") {
    await runSyncOnce(config);
    return;
  }

  if (command === "audit" || command === "audit-once") {
    await runAuditOnce(config);
    return;
  }

  if (command === "refresh") {
    await refreshCatalogCache(config);
    return;
  }

  if (command === "scheduler") {
    await runScheduler(config);
    return;
  }

  console.log(`Unknown command: ${command}`);
  console.log("Available commands: scheduler, sync, audit, refresh");
  process.exitCode = 1;
}

await main().catch((error) => {
  logError(error instanceof Error ? error.message : "Worker gagal dijalankan.");
  process.exit(1);
});
