#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";

const mode = (process.argv[2] || "dev").trim().toLowerCase();
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

function shutdown(signal = "SIGTERM") {
  if (exiting) {
    return;
  }

  exiting = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
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
      shutdown();
      process.exit(code ?? 1);
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
  shutdown();
  process.exit(1);
}

for (const workerService of workerServices) {
  startService(workerService);
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
  process.exit(0);
});
