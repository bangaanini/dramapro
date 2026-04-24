const projectRoot = __dirname;
const appPort = "3001";
const workerBaseUrl = `http://127.0.0.1:${appPort}`;
const workerProviders =
  "dramabox,shortmax,dramadash,flickreels,goodshort,melolo,netshort,reelbuzz,freereels,dramamax,flickshort,radreels,hishort,dramawave,litetv,chill,dramarush,movietv,drakor,cachebjav,meloshort,dramanova,microdrama";

const loadEnvScript = [
  "set -a",
  '[ -f ./.env ] && . ./.env',
  '[ -f ./.env.local ] && . ./.env.local',
  "set +a",
].join("; ");

module.exports = {
  apps: [
    {
      name: "layardrama",
      cwd: projectRoot,
      script: "bash",
      args: [
        "-lc",
        [
          loadEnvScript,
          `export PORT="${appPort}"`,
          'exec node node_modules/next/dist/bin/next start --port "$PORT"',
        ].join("; "),
      ],
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "700M",
      time: true,
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "layardrama-ops",
      cwd: projectRoot,
      script: "bash",
      args: [
        "-lc",
        [
          loadEnvScript,
          `export PORT="${appPort}"`,
          `export WORKER_BASE_URL="${workerBaseUrl}"`,
          `export WORKER_PROVIDERS="${workerProviders}"`,
          'export DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}"',
          "export WORKER_SYNC_INTERVAL_MINUTES=\"${WORKER_SYNC_INTERVAL_MINUTES:-30}\"",
          "export WORKER_AUDIT_INTERVAL_MINUTES=\"${WORKER_AUDIT_INTERVAL_MINUTES:-60}\"",
          "export WORKER_AUDIT_INITIAL_DELAY_MINUTES=\"${WORKER_AUDIT_INITIAL_DELAY_MINUTES:-15}\"",
          "export WORKER_SYNC_ON_START=\"${WORKER_SYNC_ON_START:-true}\"",
          "export WORKER_AUDIT_ON_START=\"${WORKER_AUDIT_ON_START:-false}\"",
          "export WORKER_REFRESH_AFTER_RUN=\"${WORKER_REFRESH_AFTER_RUN:-true}\"",
          "export WORKER_SYNC_PAGES=\"${WORKER_SYNC_PAGES:-3}\"",
          "export WORKER_AUDIT_BATCH_SIZE=\"${WORKER_AUDIT_BATCH_SIZE:-10}\"",
          "export WORKER_NOTIFY_ON_SUCCESS=\"${WORKER_NOTIFY_ON_SUCCESS:-true}\"",
          "export WORKER_NOTIFY_ON_FAILURE=\"${WORKER_NOTIFY_ON_FAILURE:-true}\"",
          "exec node scripts/ops-worker.mjs scheduler",
        ].join("; "),
      ],
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      time: true,
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
