import type { JsonRecord, ProviderCode } from "@/lib/streamapi/types";

export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderCode,
    readonly status: number,
    readonly body: string
  ) {
    super(message);
  }
}

export interface ProviderRequest {
  provider: ProviderCode;
  baseUrl: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

const MAX_RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 500;
const MAX_RATE_LIMIT_DELAY_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.min(MAX_RATE_LIMIT_DELAY_MS, Math.floor(asNumber * 1000));
  }
  const date = Date.parse(trimmed);
  if (!Number.isNaN(date)) {
    return Math.min(MAX_RATE_LIMIT_DELAY_MS, Math.max(0, date - Date.now()));
  }
  return null;
}

export async function fetchProviderText(request: ProviderRequest): Promise<string> {
  const token = process.env.STREAMAPI_TOKEN?.trim();
  const url = new URL(`${request.baseUrl}${request.path}`);

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  if (token) url.searchParams.set("token", token);

  const configuredTimeout = request.timeoutMs ?? Number(process.env.PROVIDER_TIMEOUT_MS ?? 15_000);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15_000;

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    let text: string;
    try {
      response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json"
        },
        signal: controller.signal
      });
      text = await response.text();
    } finally {
      clearTimeout(timeout);
    }

    if (response.ok) {
      return text;
    }

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfterMs =
        parseRetryAfterMs(response.headers.get("retry-after")) ??
        Math.min(MAX_RATE_LIMIT_DELAY_MS, RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt);
      attempt += 1;
      await sleep(retryAfterMs);
      continue;
    }

    throw new ProviderHttpError(
      `Provider ${request.provider} returned HTTP ${response.status}`,
      request.provider,
      response.status,
      text
    );
  }
}

export async function fetchProviderJson<T = JsonRecord>(request: ProviderRequest): Promise<T> {
  const text = await fetchProviderText(request);
  return (text ? JSON.parse(text) : {}) as T;
}
