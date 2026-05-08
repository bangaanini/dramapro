#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import nextEnv from "@next/env";

const mode = (process.argv[2] || "dev").trim().toLowerCase();
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), mode === "dev");

const appPort = (process.env.PORT || "3000").trim();
const appBaseUrl =
  process.env.WORKER_BASE_URL?.trim() || `http://127.0.0.1:${appPort}`;

function createServices(currentMode) {
  if (currentMode === "dev") {
    return [
      {
        name: "app",
        color: "\x1b[36m",
        command: "npm",
        args: ["run", "dev", "--", "--port", appPort],
      },
      {
        name: "provider-worker",
        color: "\x1b[33m",
        command: "npm",
        args: ["run", "worker:provider-sync"],
      },
      {
        name: "promo-worker",
        color: "\x1b[35m",
        command: "npm",
        args: ["run", "worker:promo-download"],
      },
      {
        name: "push-worker",
        color: "\x1b[32m",
        command: "npm",
        args: ["run", "worker:push-notifications"],
      },
    ];
  }

  if (currentMode === "start") {
    return [
      {
        name: "app",
        color: "\x1b[36m",
        command: "npm",
        args: ["run", "start", "--", "--port", appPort],
      },
      {
        name: "provider-worker",
        color: "\x1b[33m",
        command: "npm",
        args: ["run", "worker:provider-sync"],
      },
      {
        name: "promo-worker",
        color: "\x1b[35m",
        command: "npm",
        args: ["run", "worker:promo-download"],
      },
      {
        name: "push-worker",
        color: "\x1b[32m",
        command: "npm",
        args: ["run", "worker:push-notifications"],
      },
    ];
  }

  return null;
}

const services = createServices(mode);

if (!services) {
  console.error(`Unknown mode: ${mode}`);
  console.error("Available modes: dev, start");
  process.exit(1);
}

const reset = "\x1b[0m";
const children = [];
let exiting = false;
let shutdownExitCode = 0;
let shutdownTimer = null;

function prefixOutput(name, color, chunk) {
  const lines = chunk.toString().split(/\r?\n/u);

  for (const line of lines) {
    if (!line) {
      continue;
    }

    console.log(`${color}[${name}]${reset} ${line}`);
  }
}

function buildServiceEnv(service) {
  const env = { ...process.env };

  if (service.name.includes("worker") && !env.WORKER_BASE_URL) {
    env.WORKER_BASE_URL = appBaseUrl;
  }

  if (service.name === "app" && !env.PORT) {
    env.PORT = appPort;
  }

  return env;
}

async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      reject(error);
    });

    server.listen(port, () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });
  });
}

function allChildrenExited() {
  return children.every(
    (child) => child.exitCode !== null || child.signalCode !== null,
  );
}

function shutdown(signal = "SIGTERM", exitCode = 0) {
  if (exiting) {
    return;
  }

  exiting = true;
  shutdownExitCode = exitCode;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null && !child.killed) {
      child.kill(signal);
    }
  }

  shutdownTimer = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null && !child.killed) {
        child.kill("SIGKILL");
      }
    }

    process.exit(shutdownExitCode);
  }, 5000);
}

function startService(service) {
  const child = spawn(service.command, service.args, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: buildServiceEnv(service),
  });

  child.stdout.on("data", (chunk) => {
    prefixOutput(service.name, service.color, chunk);
  });

  child.stderr.on("data", (chunk) => {
    prefixOutput(service.name, service.color, chunk);
  });

  child.on("exit", (code, signal) => {
    if (!exiting) {
      console.error(
        `${service.name} exited ${signal ? `with signal ${signal}` : `with code ${code}`}. Stopping all services.`,
      );
      shutdown("SIGTERM", code ?? 1);
      return;
    }

    if (allChildrenExited()) {
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
      }

      process.exit(shutdownExitCode);
    }
  });

  children.push(child);
  return child;
}

async function waitForAppReady() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60_000) {
    if (exiting) {
      return false;
    }

    try {
      const response = await fetch(appBaseUrl, {
        redirect: "manual",
      });

      if (response.status < 500) {
        return true;
      }
    } catch {
      // App belum siap menerima request.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  return false;
}

const appService = services.find((service) => service.name === "app");
const workerServices = services.filter((service) => service.name.includes("worker"));

if (!appService || workerServices.length === 0) {
  console.error("App service atau worker service tidak ditemukan.");
  process.exit(1);
}

try {
  await assertPortAvailable(Number(appPort));
} catch {
  console.error(
    `Port ${appPort} sudah dipakai proses lain. Hentikan proses lama dulu agar app dan worker tidak salah target.`,
  );
  process.exit(1);
}

startService(appService);

const appReady = await waitForAppReady();

if (!appReady) {
  console.error(`App tidak siap di ${appBaseUrl} dalam 60 detik. Stopping all services.`);
  shutdown("SIGTERM", 1);
  await new Promise(() => {});
}

for (const workerService of workerServices) {
  startService(workerService);
}

process.on("SIGINT", () => {
  shutdown("SIGINT", 0);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM", 0);
});
