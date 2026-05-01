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

export async function fetchProviderJson<T = JsonRecord>(request: ProviderRequest): Promise<T> {
  const token = process.env.STREAMAPI_TOKEN;
  const url = new URL(`${request.baseUrl}${request.path}`);

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  if (token) url.searchParams.set("token", token);

  const configuredTimeout = request.timeoutMs ?? Number(process.env.PROVIDER_TIMEOUT_MS ?? 15_000);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15_000;
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

  if (!response.ok) {
    throw new ProviderHttpError(`Provider ${request.provider} returned HTTP ${response.status}`, request.provider, response.status, text);
  }

  return (text ? JSON.parse(text) : {}) as T;
}
