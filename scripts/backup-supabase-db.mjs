#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function loadEnvFile(filePath) {
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

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio ?? "pipe",
    shell: false,
    env: options.env ?? process.env,
    encoding: "utf8",
  });
}

function commandExists(command) {
  return run("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`]).status === 0;
}

function parseMajorVersion(text) {
  const match = text.match(/(\d+)(?:\.\d+)?/u);
  return match ? Number.parseInt(match[1], 10) : null;
}

function localToolMajor(command) {
  if (!commandExists(command)) return null;
  const result = run(command, ["--version"]);
  return parseMajorVersion(`${result.stdout}\n${result.stderr}`);
}

function serverMajorVersion(sourceUrl) {
  if (!commandExists("psql")) return null;
  const result = run("psql", [
    sourceUrl,
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    "show server_version_num;",
  ]);

  if (result.status !== 0) return null;

  const versionNumber = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isFinite(versionNumber)) return null;
  return Math.floor(versionNumber / 10000);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/gu, "'\\''")}'`;
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const sourceEnv = process.env.BACKUP_DATABASE_URL_ENV?.trim() || "PROD_DIRECT_URL";
const sourceUrl = process.env[sourceEnv];

if (!sourceUrl) {
  console.error(`${sourceEnv} tidak ditemukan. Set BACKUP_DATABASE_URL_ENV jika ingin memakai env lain.`);
  process.exit(1);
}

const outputDir = resolve(process.env.DB_BACKUP_DIR?.trim() || "backups");
mkdirSync(outputDir, { recursive: true });

const schemaList = (process.env.DB_BACKUP_SCHEMAS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
const schemaLabel = schemaList.length ? schemaList.join("_") : "full";
const outputFile = resolve(
  process.env.DB_BACKUP_FILE?.trim() ||
    `${outputDir}/supabase-${sourceEnv.toLowerCase()}-${schemaLabel}-${timestamp}.dump`,
);

const serverMajor = serverMajorVersion(sourceUrl);
const pgDumpMajor = localToolMajor("pg_dump");
const useDocker =
  process.env.DB_BACKUP_USE_DOCKER === "1" ||
  !pgDumpMajor ||
  (serverMajor !== null && pgDumpMajor < serverMajor);

const schemaArgs = schemaList.flatMap((schema) => ["--schema", schema]);

console.info(`Backup source env : ${sourceEnv}`);
console.info(`Backup mode       : ${schemaList.length ? schemaList.join(", ") : "full database"}`);
console.info(`Output file       : ${outputFile}`);
console.info(`Server major      : ${serverMajor ?? "unknown"}`);
console.info(`Local pg_dump     : ${pgDumpMajor ?? "missing"}`);

if (useDocker) {
  if (!serverMajor) {
    console.error("Tidak bisa menentukan versi Postgres server untuk Docker pg_dump.");
    process.exit(1);
  }

  if (!commandExists("docker")) {
    console.error(
      `pg_dump lokal tidak kompatibel, dan Docker tidak tersedia. Install postgresql-client-${serverMajor}.`,
    );
    process.exit(1);
  }

  const schemaShell = schemaArgs.map(shellQuote).join(" ");
  const command = [
    "pg_dump",
    '"$SOURCE_DATABASE_URL"',
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--verbose",
    "--file",
    shellQuote(`/backup/${basename(outputFile)}`),
    schemaShell,
  ]
    .filter(Boolean)
    .join(" ");

  console.info(`Using Docker image: postgres:${serverMajor}`);
  const result = run(
    "docker",
    [
      "run",
      "--rm",
      "-e",
      `SOURCE_DATABASE_URL=${sourceUrl}`,
      "-v",
      `${outputDir}:/backup`,
      `postgres:${serverMajor}`,
      "sh",
      "-lc",
      command,
    ],
    { stdio: "inherit" },
  );

  process.exit(result.status ?? 1);
}

const result = run(
  "sh",
  [
    "-lc",
    [
      "pg_dump",
      '"$SOURCE_DATABASE_URL"',
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--verbose",
      "--file",
      shellQuote(outputFile),
      ...schemaArgs.map(shellQuote),
    ].join(" "),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      SOURCE_DATABASE_URL: sourceUrl,
    },
  },
);

process.exit(result.status ?? 1);
