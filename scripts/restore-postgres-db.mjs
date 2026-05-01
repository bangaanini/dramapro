#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
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

function targetLooksRemote(urlValue) {
  try {
    const url = new URL(urlValue);
    return /supabase\.com|pooler\.supabase\.com/u.test(url.hostname);
  } catch {
    return true;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/gu, "'\\''")}'`;
}

function runSql(targetUrl, sql, useDocker, dockerMajor) {
  if (useDocker) {
    const result = run(
      "docker",
      [
        "run",
        "--rm",
        "--network=host",
        "-e",
        `TARGET_DATABASE_URL=${targetUrl}`,
        `postgres:${dockerMajor}`,
        "sh",
        "-lc",
        `psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c ${shellQuote(sql)}`,
      ],
      { stdio: "inherit" },
    );
    return result.status ?? 1;
  }

  const result = run(
    "sh",
    ["-lc", `psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c ${shellQuote(sql)}`],
    {
      stdio: "inherit",
      env: { ...process.env, TARGET_DATABASE_URL: targetUrl },
    },
  );
  return result.status ?? 1;
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const dumpFile = resolve(process.argv[2] || process.env.DB_RESTORE_FILE || "");
const targetEnv = process.env.RESTORE_DATABASE_URL_ENV?.trim() || "LOCAL_DATABASE_URL";
const targetUrl = process.env[targetEnv];
const dockerMajor = Number.parseInt(process.env.DB_RESTORE_POSTGRES_MAJOR?.trim() || "17", 10);
const pgRestoreMajor = localToolMajor("pg_restore");
const useDocker =
  process.env.DB_RESTORE_USE_DOCKER === "1" ||
  !pgRestoreMajor ||
  (Number.isFinite(dockerMajor) && pgRestoreMajor < dockerMajor);

if (!dumpFile || !existsSync(dumpFile)) {
  console.error("File dump tidak ditemukan. Pakai: npm run db:restore:local -- backups/file.dump");
  process.exit(1);
}

if (!targetUrl) {
  console.error(`${targetEnv} tidak ditemukan. Set LOCAL_DATABASE_URL di .env untuk target PostgreSQL lokal.`);
  process.exit(1);
}

if (targetLooksRemote(targetUrl) && process.env.ALLOW_REMOTE_RESTORE !== "1") {
  console.error(
    `Target ${targetEnv} terlihat seperti database remote/Supabase. Restore dibatalkan untuk mencegah salah timpa.`,
  );
  console.error("Jika benar-benar sengaja, set ALLOW_REMOTE_RESTORE=1.");
  process.exit(1);
}

if (process.env.CONFIRM_RESTORE !== "YES") {
  console.error("Restore bersifat destruktif karena memakai --clean --if-exists.");
  console.error("Set CONFIRM_RESTORE=YES untuk melanjutkan.");
  process.exit(1);
}

if (useDocker && !commandExists("docker")) {
  console.error(`pg_restore lokal tidak kompatibel, dan Docker tidak tersedia. Install postgresql-client-${dockerMajor}.`);
  process.exit(1);
}

console.info(`Restore target env : ${targetEnv}`);
console.info(`Dump file          : ${dumpFile}`);
console.info(`Local pg_restore   : ${pgRestoreMajor ?? "missing"}`);
console.info(`Restore runner     : ${useDocker ? `docker postgres:${dockerMajor}` : "local pg_restore"}`);

if (process.env.CREATE_SUPABASE_COMPAT_ROLES === "1") {
  const rolesSql = `
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then create role supabase_storage_admin nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator nologin; end if;
end
$$;`;
  const roleStatus = runSql(targetUrl, rolesSql, useDocker, dockerMajor);
  if (roleStatus !== 0) process.exit(roleStatus);
}

if (useDocker) {
  const result = run(
    "docker",
    [
      "run",
      "--rm",
      "--network=host",
      "-e",
      `TARGET_DATABASE_URL=${targetUrl}`,
      "-v",
      `${dirname(dumpFile)}:/backup`,
      `postgres:${dockerMajor}`,
      "sh",
      "-lc",
      [
        "pg_restore",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--verbose",
        "--dbname",
        '"$TARGET_DATABASE_URL"',
        shellQuote(`/backup/${basename(dumpFile)}`),
      ].join(" "),
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
      "pg_restore",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--verbose",
      "--dbname",
      '"$TARGET_DATABASE_URL"',
      shellQuote(dumpFile),
    ].join(" "),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, TARGET_DATABASE_URL: targetUrl },
  },
);

process.exit(result.status ?? 1);
