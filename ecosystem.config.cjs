const projectRoot = __dirname;
const appPort = "3001";
const workerBaseUrl = `http://127.0.0.1:${appPort}`;

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
      name: "layardrama-provider-sync",
      cwd: projectRoot,
      script: "bash",
      args: [
        "-lc",
        [
          loadEnvScript,
          `export WORKER_BASE_URL="${workerBaseUrl}"`,
          'export DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}"',
          "exec npm run worker:provider-sync",
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
    {
      name: "layardrama-promo-download",
      cwd: projectRoot,
      script: "bash",
      args: [
        "-lc",
        [
          loadEnvScript,
          `export WORKER_BASE_URL="${workerBaseUrl}"`,
          'export DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}"',
          "exec npm run worker:promo-download",
        ].join("; "),
      ],
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      time: true,
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
