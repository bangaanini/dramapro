const UPSTREAM_NEW_API_BASE_URL =
  process.env.UPSTREAM_NEW_API_BASE_URL?.trim() || "https://api.dracinku.site";
const UPSTREAM_NEW_API_KEY =
  process.env.UPSTREAM_NEW_API_KEY?.trim() || "6G7C-RL57-2Z8O-ZVER";
const UPSTREAM_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.UPSTREAM_NEW_API_TIMEOUT_MS?.trim() || "25000",
  10,
);
const UPSTREAM_MAX_RETRIES = Number.parseInt(
  process.env.UPSTREAM_NEW_API_RETRIES?.trim() || "3",
  10,
);

export const CATALOG_PLATFORM_IDS = [
  "dramabox",
  "shortmax",
  "shorten",
  "dramadash",
  "flickreels",
  "goodshort",
  "melolo",
  "netshort",
  "reelbuzz",
  "freereels",
  "dramamax",
  "flickshort",
  "radreels",
  "hishort",
  "dramawave",
  "litetv",
  "chill",
  "dramarush",
  "movietv",
  "drakor",
  "cachebjav",
  "meloshort",
  "dramanova",
  "microdrama",
] as const;

export type CatalogPlatformId = (typeof CATALOG_PLATFORM_IDS)[number];

export const CATALOG_PLATFORM_LABELS: Record<CatalogPlatformId, string> = {
  dramabox: "DramaBox",
  shortmax: "ShortMax",
  shorten: "Shorten",
  dramadash: "DramaDash",
  flickreels: "FlickReels",
  goodshort: "GoodShort",
  melolo: "Melolo",
  netshort: "NetShort",
  reelbuzz: "ReelBuzz",
  freereels: "FreeReels",
  dramamax: "DramaMax",
  flickshort: "FlickShort",
  radreels: "RadReels",
  hishort: "HiShort",
  dramawave: "DramaWave",
  litetv: "LiteTV",
  chill: "Chill",
  dramarush: "DramaRush",
  movietv: "MovieTV",
  drakor: "Drakor",
  cachebjav: "CacheBJAV",
  meloshort: "MeloShort",
  dramanova: "DramaNova",
  microdrama: "MicroDrama",
};

export const DEFAULT_CATALOG_PLATFORM =
  process.env.CATALOG_DEFAULT_PLATFORM?.trim() || "dramabox";
export const DEFAULT_CATALOG_LANGUAGE =
  process.env.CATALOG_DEFAULT_LANGUAGE?.trim() || "id";

export type UpstreamLanguagePayload = {
  supported: string[];
  mapping: Record<string, string>;
};

export type UpstreamTabItem = {
  type: string;
  name: string;
  tab_key: string;
  position_index: number | string | null;
};

export type UpstreamPageInfo = {
  has_more: boolean | string | number | null;
  pageNo?: number | string | null;
  pageSize?: number | string | null;
  tabKey?: string | number | null;
  positionIndex?: number | string | null;
} & Record<string, unknown>;

export type UpstreamSeriesSummary = {
  id: string;
  name: string;
  cover: string;
  chapterCount: number;
  introduction: string;
  tags: string[];
  playCount: string;
};

export type UpstreamSubtitle = {
  language: string;
  display_name: string;
  subtitle: string;
};

export type UpstreamSeriesDetail = {
  book: {
    id: string;
    name: string;
    chapterCount: number;
    introduction: string;
    cover?: string;
    tags?: string[];
    playCount?: string | number | null;
  };
  chapters: Array<{
    eps: string;
    index: number | string;
    videoPath: string | null;
    subtitle?: UpstreamSubtitle[];
  }>;
};

export class CatalogUpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "CatalogUpstreamError";
  }
}

function buildUrl(pathname: string, searchParams?: URLSearchParams) {
  const normalizedBaseUrl = UPSTREAM_NEW_API_BASE_URL.replace(/\/+$/, "");
  const suffix = searchParams?.toString();
  return `${normalizedBaseUrl}${pathname}${suffix ? `?${suffix}` : ""}`;
}

async function upstreamFetch<T>(
  pathname: string,
  init?: RequestInit,
  searchParams?: URLSearchParams,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= Math.max(1, UPSTREAM_MAX_RETRIES); attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(
        new Error(`Upstream request timed out after ${UPSTREAM_REQUEST_TIMEOUT_MS}ms.`),
      );
    }, Math.max(1_000, UPSTREAM_REQUEST_TIMEOUT_MS));

    try {
      const response = await fetch(buildUrl(pathname, searchParams), {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-Key": UPSTREAM_NEW_API_KEY,
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        data?: T;
      } | null;

      if (!response.ok || !payload?.success) {
        const error = new CatalogUpstreamError(
          payload?.message ||
            `Upstream request failed for ${pathname} with status ${response.status}.`,
          response.status,
          payload,
        );

        const shouldRetry =
          attempt < Math.max(1, UPSTREAM_MAX_RETRIES) &&
          (response.status === 408 ||
            response.status === 429 ||
            response.status >= 500);

        if (shouldRetry) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, attempt * 1_200));
          continue;
        }

        throw error;
      }

      return payload.data as T;
    } catch (error) {
      lastError = error;

      const shouldRetry =
        attempt < Math.max(1, UPSTREAM_MAX_RETRIES) &&
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.toLowerCase().includes("fetch failed") ||
          error.message.toLowerCase().includes("timed out") ||
          error.message.toLowerCase().includes("connect timeout"));

      if (shouldRetry) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_200));
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Upstream request failed for ${pathname}.`);
}

function normalizeSeriesSummary(input: Partial<UpstreamSeriesSummary> & { id?: string; name?: string }) {
  return {
    id: String(input.id ?? "").trim(),
    name: String(input.name ?? "").trim(),
    cover: String(input.cover ?? "").trim(),
    chapterCount: Number.isFinite(Number(input.chapterCount))
      ? Math.max(0, Number(input.chapterCount))
      : 0,
    introduction: String(input.introduction ?? "").trim(),
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [],
    playCount: String(input.playCount ?? "").trim(),
  } satisfies UpstreamSeriesSummary;
}

function normalizeNumericValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBooleanValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value ?? "").trim().toLowerCase();

  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeTabItem(
  input: Partial<UpstreamTabItem>,
  index: number,
) {
  return {
    type: String(input.type ?? "").trim(),
    name: String(input.name ?? "").trim(),
    tab_key: String(input.tab_key ?? "").trim(),
    position_index: normalizeNumericValue(input.position_index, index),
  } satisfies {
    type: string;
    name: string;
    tab_key: string;
    position_index: number;
  };
}

function normalizePageInfo(input?: Partial<UpstreamPageInfo> | null) {
  const raw = (input ?? {}) as Record<string, unknown>;

  return {
    ...raw,
    has_more: normalizeBooleanValue(
      raw.has_more ?? raw.hasMore ?? raw.isMore,
      false,
    ),
    pageNo: normalizeNumericValue(raw.pageNo ?? raw.pageNum ?? raw.next, 1),
    pageSize: normalizeNumericValue(raw.pageSize ?? raw.limit, 0),
    tabKey: String(raw.tabKey ?? raw.key ?? "").trim(),
    positionIndex: normalizeNumericValue(
      raw.positionIndex ?? raw.position_index,
      0,
    ),
  } satisfies UpstreamPageInfo;
}

function buildDefaultPageInfo(overrides?: Partial<UpstreamPageInfo>) {
  return normalizePageInfo({
    has_more: false,
    ...overrides,
  });
}

export async function fetchPlatformLanguages(
  platform = DEFAULT_CATALOG_PLATFORM,
) {
  return upstreamFetch<UpstreamLanguagePayload>(`/${platform}/languages`);
}

export async function fetchPlatformTablist(
  platform = DEFAULT_CATALOG_PLATFORM,
  lang = DEFAULT_CATALOG_LANGUAGE,
) {
  const params = new URLSearchParams({ lang });
  const payload = await upstreamFetch<UpstreamTabItem[]>(
    `/${platform}/tablist`,
    undefined,
    params,
  );

  return payload.map((item, index) => normalizeTabItem(item, index));
}

export async function fetchPlatformTabdata(
  input: {
    platform?: string;
    lang?: string;
    key: string;
    positionIndex: number;
    type: string;
  },
) {
  const params = new URLSearchParams({
    lang: input.lang ?? DEFAULT_CATALOG_LANGUAGE,
  });

  const payload = await upstreamFetch<{
    isMore?: boolean | string | number | null;
    book?: {
      list?: UpstreamSeriesSummary[];
      recommend?: UpstreamSeriesSummary[];
    };
    page_info?: UpstreamPageInfo;
  }>(
    `/${input.platform ?? DEFAULT_CATALOG_PLATFORM}/tabdata`,
    {
      method: "POST",
      body: JSON.stringify({
        key: input.key,
        positionIndex: input.positionIndex,
        type: input.type,
      }),
    },
    params,
  );

  return {
    entries: [
      ...(payload.book?.list ?? []),
      ...(payload.book?.recommend ?? []),
    ].map(normalizeSeriesSummary),
    pageInfo: buildDefaultPageInfo({
      ...payload.page_info,
      has_more: payload.page_info?.has_more ?? payload.isMore,
    }),
  };
}

export async function fetchPlatformTabfeed(
  input: {
    platform?: string;
    lang?: string;
    pageInfo: UpstreamPageInfo;
  },
) {
  const params = new URLSearchParams({
    lang: input.lang ?? DEFAULT_CATALOG_LANGUAGE,
  });

  const payload = await upstreamFetch<{
    isMore?: boolean | string | number | null;
    book?: UpstreamSeriesSummary[];
    page_info?: UpstreamPageInfo;
  }>(
    `/${input.platform ?? DEFAULT_CATALOG_PLATFORM}/tabfeed`,
    {
      method: "POST",
      body: JSON.stringify({
        page_info: input.pageInfo,
      }),
    },
    params,
  );

  return {
    entries: (payload.book ?? []).map(normalizeSeriesSummary),
    pageInfo: buildDefaultPageInfo({
      ...payload.page_info,
      has_more: payload.page_info?.has_more ?? payload.isMore,
    }),
  };
}

export async function fetchPlatformSearch(
  keyword: string,
  platform = DEFAULT_CATALOG_PLATFORM,
  lang = DEFAULT_CATALOG_LANGUAGE,
) {
  const params = new URLSearchParams({ lang });
  const payload = await upstreamFetch<{
    book?: UpstreamSeriesSummary[];
    page_info?: UpstreamPageInfo;
  }>(
    `/${platform}/search`,
    {
      method: "POST",
      body: JSON.stringify({
        keyword,
      }),
    },
    params,
  );

  return {
    entries: (payload.book ?? []).map(normalizeSeriesSummary),
    pageInfo: buildDefaultPageInfo(payload.page_info),
  };
}

export async function fetchPlatformSeriesDetail(
  seriesId: string,
  input?: {
    platform?: string;
    lang?: string;
    quality?: number;
  },
) {
  const params = new URLSearchParams({
    lang: input?.lang ?? DEFAULT_CATALOG_LANGUAGE,
    quality: String(input?.quality ?? 720),
  });

  return upstreamFetch<UpstreamSeriesDetail>(
    `/${input?.platform ?? DEFAULT_CATALOG_PLATFORM}/series/${encodeURIComponent(seriesId)}`,
    undefined,
    params,
  );
}
