import {
  PROVIDERS,
  SYNC_SOURCES,
  isProviderType,
  isSyncSource,
} from "../../lib/provider-adapter";
import { runBatchSync } from "../../lib/sync-dramas";

function parseProviders() {
  const raw = process.env.SYNC_PROVIDERS?.trim();

  if (!raw) {
    return [...PROVIDERS];
  }

  const parsed = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is (typeof PROVIDERS)[number] => isProviderType(value));

  return parsed.length ? parsed : [...PROVIDERS];
}

function parsePages() {
  const raw = process.env.SYNC_PAGES?.trim();

  if (!raw) {
    return [1];
  }

  const parsed = raw
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  return parsed.length ? parsed : [1];
}

function parseSources(): Array<(typeof SYNC_SOURCES)[number]> {
  const raw = process.env.SYNC_SOURCES?.trim();

  if (!raw) {
    return ["new"];
  }

  const parsed = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is (typeof SYNC_SOURCES)[number] => isSyncSource(value));

  return parsed.length ? parsed : ["new"];
}

async function handler() {
  try {
    const result = await runBatchSync({
      providers: parseProviders(),
      pages: parsePages(),
      sources: parseSources(),
    });

    console.log("Scheduled sync completed", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scheduled sync failed.";

    console.error("Scheduled sync failed", error);

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }
}

export default handler;

export const config = {
  schedule: "0 */6 * * *",
};
