import { normalizeDisplayImageUrl } from "@/lib/utils";

const API_BASE_URL =
  process.env.UPSTREAM_API_BASE_URL?.trim() ||
  "https://api.sonzaix.indevs.in";
const GOODSHORT_API_BASE_URL =
  process.env.GOODSHORT_API_BASE_URL?.trim() ||
  API_BASE_URL;
const DRAMABOX_API_BASE_URL =
  process.env.DRAMABOX_API_BASE_URL?.trim() ||
  API_BASE_URL;
const DRAMABOX_EDGE_BASE_URL = process.env.DRAMABOX_EDGE_BASE_URL?.trim() || "";
export const DEFAULT_LANG = "id";

export const PROVIDERS = [
  "goodshort",
  "dramabox",
] as const;

export type ProviderType = (typeof PROVIDERS)[number];
export const SYNC_SOURCES = ["home", "new", "popular"] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];

function parseProviderList(
  rawValue: string | null | undefined,
  fallback: readonly ProviderType[] = PROVIDERS,
): ProviderType[] {
  const raw = rawValue?.trim() ?? "";

  if (!raw) {
    return [...fallback];
  }

  const parsed = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is ProviderType => PROVIDERS.includes(value as ProviderType));

  return parsed.length ? parsed : [...fallback];
}

export const ACTIVE_PROVIDERS = parseProviderList(process.env.ACTIVE_PROVIDERS);
const ACTIVE_PROVIDER_SET = new Set<ProviderType>(ACTIVE_PROVIDERS);

type JsonRecord = Record<string, unknown>;

type FetchJsonOptions = {
  revalidate?: number;
  timeoutMs?: number;
  cacheMode?: RequestCache;
};

const UPSTREAM_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};

export type NormalizedDramaMetadata = {
  providerDramaId: string;
  providerName: ProviderType;
  title: string;
  description: string;
  thumbUrl: string;
  episodeCount: number;
  watchValue: string;
  isNewBook: boolean;
  tags: string[];
};

export type ProviderDetailMetadata = Partial<NormalizedDramaMetadata>;

export type StreamResponse = {
  dramaId: string;
  provider: ProviderType;
  episodeIndex: number;
  defaultQuality: string | null;
  qualities: {
    label: string;
    url: string;
    mimeType: "application/x-mpegURL" | "video/mp4";
  }[];
  subtitles: {
    label: string;
    language: string;
    url: string;
  }[];
};

type StreamResolutionArgs = {
  provider: ProviderType;
  providerDramaId: string;
  episodeIndex: number;
  lang?: string;
};

type StreamBuildArgs = {
  id?: string;
  lang?: string;
  page?: number;
  episodeIndex?: number;
  episodeId?: string;
  chapterId?: string;
  videoId?: string;
};

type NormalizeStreamPayloadArgs = {
  dramaId: string;
  provider: ProviderType;
  episodeIndex: number;
  payload: unknown;
};

type UpstreamRequestKind = SyncSource | "detail" | "stream";

export class UpstreamHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "UpstreamHttpError";
  }
}

export function isProviderType(value: string): value is ProviderType {
  return PROVIDERS.includes(value as ProviderType);
}

export function isActiveProviderType(value: string): value is ProviderType {
  return ACTIVE_PROVIDER_SET.has(value as ProviderType);
}

export function parseActiveProviderList(rawValue: string | null | undefined) {
  const parsed = parseProviderList(rawValue, ACTIVE_PROVIDERS);
  const filtered = parsed.filter((provider) => ACTIVE_PROVIDER_SET.has(provider));

  return filtered.length ? filtered : [...ACTIVE_PROVIDERS];
}

export function isSyncSource(value: string): value is SyncSource {
  return SYNC_SOURCES.includes(value as SyncSource);
}

export function normalizeSyncSource(value: string): SyncSource | null {
  if (value === "populer") {
    return "popular";
  }

  return isSyncSource(value) ? value : null;
}

function resolveProviderLang(provider: ProviderType, lang = DEFAULT_LANG) {
  if (provider === "dramabox" && (!lang || lang === DEFAULT_LANG)) {
    return "in";
  }

  return lang;
}

function isDramaboxEdgeLikeBaseUrl(baseUrl: string) {
  if (!baseUrl) {
    return false;
  }

  return (
    baseUrl === DRAMABOX_EDGE_BASE_URL ||
    /\/functions\/v1\/dramabox\/?$/i.test(baseUrl)
  );
}

function buildDramaboxApiCollectionUrl(
  baseUrl: string,
  source: SyncSource,
  page: number,
  lang = DEFAULT_LANG,
) {
  const resolvedLang = resolveProviderLang("dramabox", lang);
  const sourceKey = source === "popular" ? "populer" : source;

  if (isDramaboxEdgeLikeBaseUrl(baseUrl)) {
    const params = new URLSearchParams({
      page: String(page),
      lang: resolvedLang,
    });
    params.set(sourceKey, "1");
    return `${baseUrl}?${params.toString()}`;
  }

  return `${baseUrl}/dramabox/${sourceKey}?page=${page}&lang=${encodeURIComponent(resolvedLang)}`;
}

function buildDramaboxApiDetailUrl(baseUrl: string, id: string, lang = DEFAULT_LANG) {
  const resolvedLang = resolveProviderLang("dramabox", lang);

  if (isDramaboxEdgeLikeBaseUrl(baseUrl)) {
    const params = new URLSearchParams({
      bookId: id,
      lang: resolvedLang,
    });

    return `${baseUrl}/detail?${params.toString()}`;
  }

  return `${baseUrl}/dramabox/detail/${encodeURIComponent(id)}?lang=${encodeURIComponent(resolvedLang)}`;
}

function buildDramaboxApiStreamUrl(baseUrl: string, args: StreamBuildArgs) {
  const lang = resolveProviderLang("dramabox", args.lang ?? DEFAULT_LANG);
  const id = requireStringArg(args.id, "id");
  const episodeIndex = String(requireNumberArg(args.episodeIndex, "episodeIndex"));

  if (isDramaboxEdgeLikeBaseUrl(baseUrl)) {
    const params = new URLSearchParams({
      bookId: id,
      episodeIndex,
      lang,
    });

    return `${baseUrl}/stream?${params.toString()}`;
  }

  return `${baseUrl}/dramabox/stream?dramaId=${encodeURIComponent(id)}&episodeIndex=${encodeURIComponent(episodeIndex)}&lang=${encodeURIComponent(lang)}`;
}

export function buildCollectionUrl(
  provider: ProviderType,
  source: SyncSource,
  page: number,
  lang = DEFAULT_LANG,
) {
  const resolvedLang = resolveProviderLang(provider, lang);
  const upstreamSource = source === "popular" ? "populer" : source;

  switch (provider) {
    case "goodshort": {
      const params = new URLSearchParams({
        page: String(page),
      });
      params.set(upstreamSource, "1");
      return `${GOODSHORT_API_BASE_URL}/goodshort?${params.toString()}`;
    }
    case "dramabox":
      return buildDramaboxApiCollectionUrl(
        DRAMABOX_API_BASE_URL,
        source,
        page,
        resolvedLang,
      );
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function buildDetailUrl(
  provider: ProviderType,
  id: string,
  lang = DEFAULT_LANG,
) {
  const resolvedLang = resolveProviderLang(provider, lang);

  switch (provider) {
    case "goodshort":
      return `${GOODSHORT_API_BASE_URL}/goodshort/detail?bookId=${encodeURIComponent(id)}`;
    case "dramabox":
      return buildDramaboxApiDetailUrl(DRAMABOX_API_BASE_URL, id, resolvedLang);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function buildStreamUrl(provider: ProviderType, args: StreamBuildArgs) {
  const lang = resolveProviderLang(provider, args.lang ?? DEFAULT_LANG);

  switch (provider) {
    case "goodshort":
      return `${GOODSHORT_API_BASE_URL}/goodshort/stream?bookId=${encodeURIComponent(requireStringArg(args.id, "id"))}`;
    case "dramabox":
      return buildDramaboxApiStreamUrl(DRAMABOX_API_BASE_URL, {
        ...args,
        lang,
      });
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

function buildDramaboxEdgeCollectionUrl(
  source: SyncSource,
  page: number,
  lang = DEFAULT_LANG,
) {
  if (!DRAMABOX_EDGE_BASE_URL) {
    return null;
  }

  return buildDramaboxApiCollectionUrl(DRAMABOX_EDGE_BASE_URL, source, page, lang);
}

function buildDramaboxEdgeDetailUrl(id: string, lang = DEFAULT_LANG) {
  if (!DRAMABOX_EDGE_BASE_URL) {
    return null;
  }

  return buildDramaboxApiDetailUrl(DRAMABOX_EDGE_BASE_URL, id, lang);
}

function buildDramaboxEdgeStreamUrl(args: StreamBuildArgs) {
  if (!DRAMABOX_EDGE_BASE_URL) {
    return null;
  }

  return buildDramaboxApiStreamUrl(DRAMABOX_EDGE_BASE_URL, args);
}

function buildProviderRequestUrls(
  kind: UpstreamRequestKind,
  provider: ProviderType,
  args: StreamBuildArgs,
) {
  const primaryUrl =
    kind === "home" || kind === "new" || kind === "popular"
      ? buildCollectionUrl(provider, kind, args.page ?? 1, args.lang)
      : kind === "detail"
        ? buildDetailUrl(provider, requireStringArg(args.id, "id"), args.lang)
        : buildStreamUrl(provider, args);

  if (provider !== "dramabox") {
    return [primaryUrl];
  }

  const fallbackUrl =
    kind === "home" || kind === "new" || kind === "popular"
      ? buildDramaboxEdgeCollectionUrl(kind, args.page ?? 1, args.lang)
      : kind === "detail"
        ? buildDramaboxEdgeDetailUrl(requireStringArg(args.id, "id"), args.lang)
        : buildDramaboxEdgeStreamUrl(args);

  if (!fallbackUrl || fallbackUrl === primaryUrl) {
    return [primaryUrl];
  }

  if (kind === "home" || kind === "new" || kind === "popular") {
    return Array.from(new Set([fallbackUrl, primaryUrl]));
  }

  return Array.from(new Set([primaryUrl, fallbackUrl]));
}

function shouldTryNextUpstreamUrl(error: unknown) {
  if (error instanceof UpstreamHttpError) {
    return (
      error.status >= 500 ||
      error.status === 403 ||
      error.status === 404 ||
      error.status === 429
    );
  }

  return error instanceof Error;
}

export async function fetchProviderJson(
  kind: SyncSource | "detail" | "stream",
  provider: ProviderType,
  args: StreamBuildArgs,
  options?: FetchJsonOptions,
) {
  const urls = buildProviderRequestUrls(kind, provider, args);
  let lastError: unknown = null;

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];

    try {
      return await fetchJson(url, options);
    } catch (error) {
      lastError = error;

      if (index === urls.length - 1 || !shouldTryNextUpstreamUrl(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Provider request failed without a concrete error.");
}

export function normalizeDetailMetadata(
  provider: ProviderType,
  payload: unknown,
): ProviderDetailMetadata {
  const data = getDataRecord(payload);
  const goodshortBook = asRecord(data.book) ?? data;

  if (provider === "goodshort") {
    return {
      providerDramaId:
        readString(goodshortBook.bookId) ||
        readString(goodshortBook.drama_id) ||
        readString(goodshortBook.id),
      providerName: provider,
      title:
        readString(goodshortBook.bookName) ||
        readString(goodshortBook.drama_name),
      description:
        readString(goodshortBook.introduction) ||
        readString(goodshortBook.description),
      thumbUrl: normalizeDisplayImageUrl(
        readString(goodshortBook.bookCover) ||
          readString(goodshortBook.cover) ||
          readString(goodshortBook.thumb_url),
      ),
      episodeCount:
        readInt(goodshortBook.chapterCount) ||
        readArray(data.list)?.length ||
        readArray(data.downloadList)?.length ||
        readInt(goodshortBook.episode_count),
      watchValue:
        readString(goodshortBook.viewCountDisplay) ||
        readString(goodshortBook.viewCount) ||
        readString(goodshortBook.watch_value),
      isNewBook:
        readBoolean(goodshortBook.is_new_book) ||
        readBoolean(goodshortBook.isNewBook) ||
        false,
      tags: mergeStringArrays(
        readLooseStringArray(goodshortBook.labels),
        readLooseStringArray(goodshortBook.labelInfos),
      ),
    };
  }

  if (provider === "dramabox") {
    return {
      providerDramaId:
        readString(data.drama_id) ||
        readString(data.bookId) ||
        readString(data.id),
      providerName: provider,
      title: readString(data.drama_name) || readString(data.bookName),
      description:
        readString(data.description) || readString(data.introduction),
      thumbUrl: normalizeDisplayImageUrl(
        readString(data.thumb_url) ||
          readString(data.bookCover) ||
          readString(data.cover),
      ),
      episodeCount:
        readInt(data.episode_count) ||
        readInt(data.chapterCount) ||
        readInt(data.total_episodes),
      watchValue:
        readString(data.watch_value) ||
        readString(data.playCount) ||
        readString(data.follow_count),
      isNewBook:
        readBoolean(data.is_new_book) ||
        readBoolean(data.is_finished) ||
        readBoolean(data.vip) ||
        false,
      tags: mergeStringArrays(
        readLooseStringArray(data.tags),
        readLooseStringArray(data.tagV3s),
        readLooseStringArray(data.markNamesConnectKey),
      ),
    };
  }

  return {};
}

export function normalizeCollectionPayload(
  provider: ProviderType,
  payload: unknown,
): NormalizedDramaMetadata[] {
  if (provider === "goodshort") {
    return extractGoodshortCollectionEntries(payload)
      .map((item) => normalizeDramaMetadata(provider, item))
      .filter((item): item is NormalizedDramaMetadata => item !== null);
  }

  if (provider === "dramabox") {
    return extractDramaboxCollectionEntries(payload)
      .map((item) => normalizeDramaMetadata(provider, item))
      .filter((item): item is NormalizedDramaMetadata => item !== null);
  }

  return [];
}

export async function resolveStreamRequest({
  provider,
  providerDramaId,
  episodeIndex,
  lang = DEFAULT_LANG,
}: StreamResolutionArgs) {
  switch (provider) {
    case "goodshort":
      return {
        streamArgs: {
          id: providerDramaId,
          lang,
        },
      };
    case "dramabox": {
      await validateEpisodeFromDetail(provider, providerDramaId, episodeIndex, lang);

      return {
        streamArgs: {
          id: providerDramaId,
          episodeIndex: episodeIndex - 1,
          lang,
        },
      };
    }
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function normalizeStreamPayload({
  dramaId,
  provider,
  episodeIndex,
  payload,
}: NormalizeStreamPayloadArgs): StreamResponse {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const subtitles = normalizeProviderSubtitles(data);
  let qualities: StreamResponse["qualities"] = [];

  if (provider === "goodshort") {
    qualities = normalizeGoodshortStream(data, episodeIndex);
  } else if (provider === "dramabox") {
    qualities = normalizeDramaboxStream(data);
  }

  const deduped = dedupeQualities(qualities);
  const sorted = sortQualities(deduped);

  return {
    dramaId,
    provider,
    episodeIndex,
    defaultQuality: sorted[0]?.label ?? null,
    qualities: sorted,
    subtitles,
  };
}

export function getProviderPayloadError(payload: unknown) {
  const root = asRecord(payload);
  const code = readInt(root?.code);
  const message = readMessage(payload);

  if (code >= 400) {
    return message || `Upstream responded with code ${code}.`;
  }

  return null;
}

async function fetchDetailData(
  provider: ProviderType,
  providerDramaId: string,
  lang: string,
) {
  const payload = await fetchProviderJson(
    "detail",
    provider,
    { id: providerDramaId, lang },
    { cacheMode: "no-store" },
  );

  return getDataRecord(payload);
}

async function validateEpisodeFromDetail(
  provider: ProviderType,
  providerDramaId: string,
  episodeIndex: number,
  lang: string,
) {
  const detailData = await fetchDetailData(provider, providerDramaId, lang);
  findEpisodeEntry(detailData, episodeIndex);
}

async function fetchJson(url: string, options?: FetchJsonOptions) {
  const shouldUseRevalidate =
    typeof options?.revalidate === "number" &&
    options.cacheMode !== "no-store";

  const response = await fetch(url, {
    headers: UPSTREAM_HEADERS,
    signal: AbortSignal.timeout(options?.timeoutMs ?? 25000),
    ...(options?.cacheMode ? { cache: options.cacheMode } : {}),
    ...(shouldUseRevalidate
      ? { next: { revalidate: options.revalidate } }
      : {}),
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Upstream response was not valid JSON for ${url}.`);
    }
  }

  if (!response.ok) {
    const detail =
      readMessage(payload) ??
      `Request failed with ${response.status} for ${url}.`;
    throw new UpstreamHttpError(detail, response.status, payload);
  }

  return payload;
}

function getDataRecord(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root?.data);

  if (data) {
    return data;
  }

  if (root) {
    return root;
  }

  throw new Error("Provider payload did not contain a usable object payload.");
}

function extractDramaboxCollectionEntries(payload: unknown) {
  const root = asRecord(payload);
  const rootData = root?.data;
  const items: JsonRecord[] = [];

  if (Array.isArray(rootData)) {
    for (const block of rootData) {
      const blockRecord = asRecord(block);

      if (!blockRecord) {
        continue;
      }

      const blockBooks = readArray(blockRecord.books) ?? [];
      items.push(
        ...blockBooks
          .map((entry) => asRecord(entry))
          .filter((entry): entry is JsonRecord => entry !== null),
      );

      if (looksLikeDramaboxItem(blockRecord)) {
        items.push(blockRecord);
      }
    }
  }

  const dataRecord = asRecord(rootData);

  if (!dataRecord) {
    return dedupeDramaEntries(items);
  }

  const collectionKeys = [
    "books",
    "list",
    "records",
    "rankList",
    "recommendBookList",
    "bookList",
    "theaterList",
  ] as const;

  for (const key of collectionKeys) {
    const entries = readArray(dataRecord[key]) ?? [];
    items.push(
      ...entries
        .map((entry) => asRecord(entry))
        .filter((entry): entry is JsonRecord => entry !== null),
    );
  }

  for (const column of readArray(dataRecord.columnVoList) ?? []) {
    const columnRecord = asRecord(column);
    const entries = readArray(columnRecord?.bookList) ?? [];
    items.push(
      ...entries
        .map((entry) => asRecord(entry))
        .filter((entry): entry is JsonRecord => entry !== null),
    );
  }

  const newTheaterList = asRecord(dataRecord.newTheaterList);
  const newTheaterEntries = readArray(newTheaterList?.records) ?? [];
  items.push(
    ...newTheaterEntries
      .map((entry) => asRecord(entry))
      .filter((entry): entry is JsonRecord => entry !== null),
  );

  if (looksLikeDramaboxItem(dataRecord)) {
    items.push(dataRecord);
  }

  return dedupeDramaEntries(items);
}

function extractGoodshortCollectionEntries(payload: unknown) {
  const root = asRecord(payload);
  const dataRecord = asRecord(root?.data);
  const items: JsonRecord[] = [];

  const collectionSources = [
    readArray(dataRecord?.recommentList),
    readArray(dataRecord?.recommendBookList),
    readArray(dataRecord?.bookList),
    readArray(dataRecord?.list),
    readArray(root?.list),
  ];

  for (const entries of collectionSources) {
    for (const entry of entries ?? []) {
      const record = asRecord(entry);

      if (!record) {
        continue;
      }

      const bookRecord = asRecord(record.book);

      if (bookRecord) {
        items.push(bookRecord);
      }

      if (looksLikeGoodshortItem(record)) {
        items.push(record);
      }
    }
  }

  return dedupeDramaEntries(items);
}

function dedupeDramaEntries(items: JsonRecord[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key =
      readString(item.drama_id) ||
      readString(item.bookId) ||
      readString(item.id) ||
      readString(item.slug) ||
      readString(item.bookName);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function looksLikeDramaboxItem(item: JsonRecord | null) {
  if (!item) {
    return false;
  }

  return Boolean(
    readString(item.bookId) ||
      readString(item.bookName) ||
      readString(item.bookCover) ||
      readString(item.introduction),
  );
}

function looksLikeGoodshortItem(item: JsonRecord | null) {
  if (!item) {
    return false;
  }

  return Boolean(
    readString(item.bookId) ||
      readString(item.bookName) ||
      readString(item.cover) ||
      readString(item.bookCover) ||
      readString(item.introduction),
  );
}

function normalizeDramaMetadata(
  provider: ProviderType,
  item: JsonRecord | null,
): NormalizedDramaMetadata | null {
  if (!item) {
    return null;
  }

  if (provider === "goodshort") {
    const normalized = {
      providerDramaId:
        readString(item.bookId) ||
        readString(item.drama_id) ||
        readString(item.id),
      providerName: provider,
      title: readString(item.bookName) || readString(item.drama_name),
      description:
        readString(item.introduction) || readString(item.description),
      thumbUrl: normalizeDisplayImageUrl(
        readString(item.bookCover) ||
          readString(item.cover) ||
          readString(item.thumb_url),
      ),
      episodeCount:
        readInt(item.chapterCount) || readInt(item.episode_count),
      watchValue:
        readString(item.viewCountDisplay) ||
        readString(item.viewCount) ||
        readString(item.watch_value),
      isNewBook:
        readBoolean(item.is_new_book) ||
        readBoolean(item.isNewBook) ||
        false,
      tags: mergeStringArrays(
        readLooseStringArray(item.labels),
        readLooseStringArray(item.labelInfos),
        readLooseStringArray(item.tags),
      ),
    };

    return normalized.providerDramaId && normalized.title ? normalized : null;
  }

  if (provider === "dramabox") {
    const normalized = {
      providerDramaId:
        readString(item.drama_id) ||
        readString(item.bookId) ||
        readString(item.id),
      providerName: provider,
      title: readString(item.drama_name) || readString(item.bookName),
      description:
        readString(item.description) || readString(item.introduction),
      thumbUrl: normalizeDisplayImageUrl(
        readString(item.thumb_url) ||
          readString(item.bookCover) ||
          readString(item.cover),
      ),
      episodeCount:
        readInt(item.episode_count) ||
        readInt(item.chapterCount) ||
        readInt(item.total_episodes),
      watchValue:
        readString(item.watch_value) ||
        readString(item.playCount) ||
        readString(item.play_count),
      isNewBook:
        readBoolean(item.is_new_book) ||
        readBoolean(item.is_finished) ||
        false,
      tags: mergeStringArrays(
        readLooseStringArray(item.tags),
        readLooseStringArray(item.tagV3s),
        readLooseStringArray(item.markNamesConnectKey),
      ),
    };

    return normalized.providerDramaId && normalized.title ? normalized : null;
  }

  return null;
}

function findEpisodeEntry(detailData: JsonRecord, episodeIndex: number) {
  const candidates = [
    ...(readArray(detailData.video_list) ?? []),
    ...(readArray(detailData.episode_list) ?? []),
    ...(readArray(detailData.episodeList) ?? []),
    ...(readArray(detailData.chapterList) ?? []),
    ...(readArray(detailData.chapter_list) ?? []),
    ...(readArray(detailData.list) ?? []),
  ]
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => item !== null);

  const match = candidates.find((item) => {
    const directEpisodes = [
      readMaybeInt(item.episode),
      readMaybeInt(item.chapter_num),
      readMaybeInt(item.index),
      readMaybeInt(item.chapterName),
      incrementMaybeInt(item.chapterIndex),
    ].filter((value): value is number => typeof value === "number");

    if (directEpisodes.includes(episodeIndex)) {
      return true;
    }

    const zeroBasedIndices = [
      readMaybeInt(item.index),
      readMaybeInt(item.chapterIndex),
    ].filter((value): value is number => typeof value === "number");

    return zeroBasedIndices.some((value) => value === episodeIndex - 1);
  });

  if (!match) {
    throw new RangeError(`Episode ${episodeIndex} is out of range for this drama.`);
  }

  return {
    episodeId:
      readString(match.episode_id) ||
      readString(match.id) ||
      readString(match.chapter_id) ||
      readString(match.chapterId),
    chapterId:
      readString(match.chapter_id) ||
      readString(match.chapterId) ||
      readString(match.id),
    videoId: readString(match.video_id),
  };
}

function normalizeGoodshortStream(data: JsonRecord | null, episodeIndex: number) {
  const downloadList = readArray(data?.downloadList) ?? [];
  const selected = downloadList
    .map((item) => asRecord(item))
    .find((item) => {
      if (!item) {
        return false;
      }

      const index = readInt(item.index);
      return (
        index === episodeIndex - 1 ||
        readInt(item.episode) === episodeIndex ||
        readInt(item.chapterName) === episodeIndex
      );
    });

  const multiVideos = readArray(selected?.multiVideos) ?? [];
  const qualities: StreamResponse["qualities"] = [];

  for (const entry of multiVideos) {
    const record = asRecord(entry);

    if (!record) {
      continue;
    }

    const label = readString(record.type) || "Auto";
    const primaryUrl = readString(record.filePath);

    if (primaryUrl) {
      qualities.push({
        label,
        url: primaryUrl,
        mimeType: inferMimeType(primaryUrl),
      });
    }

    for (const cdnEntry of readArray(record.cdnList) ?? []) {
      const cdnRecord = asRecord(cdnEntry);
      const cdnUrl = readString(cdnRecord?.videoPath);

      if (!cdnUrl) {
        continue;
      }

      qualities.push({
        label,
        url: cdnUrl,
        mimeType: inferMimeType(cdnUrl),
      });
    }
  }

  const fallbackUrl = readString(selected?.cdn);

  if (fallbackUrl) {
    qualities.push({
      label: "Auto",
      url: fallbackUrl,
      mimeType: inferMimeType(fallbackUrl),
    });
  }

  return qualities.filter(isCompleteQuality);
}

function normalizeDramaboxStream(data: JsonRecord | null) {
  const qualities: StreamResponse["qualities"] = [];
  const chapterList =
    readArray(data?.chapterList) ??
    readArray(data?.chapter_list) ??
    [];
  const candidates = [
    data,
    ...chapterList.map((entry) => asRecord(entry)),
    ...chapterList.map((entry) => asRecord(asRecord(entry)?.videoInfo)),
    ...chapterList.map((entry) => asRecord(asRecord(entry)?.chapterVideoInfo)),
    ...chapterList.map((entry) => asRecord(asRecord(entry)?.playInfo)),
    ...flattenRecordArrays(chapterList, "videoPathList"),
    ...flattenRecordArrays(chapterList, "playInfoList"),
    ...flattenRecordArrays(chapterList, "playList"),
    ...flattenNestedRecordArrays(chapterList, "cdnList", "videoPathList"),
    ...flattenNestedRecordArrays(chapterList, "cdnList", "playInfoList"),
    ...flattenNestedRecordArrays(chapterList, "cdnList", "playList"),
  ].filter((entry): entry is JsonRecord => entry !== null);

  for (const chapter of chapterList) {
    const chapterRecord = asRecord(chapter);

    if (!chapterRecord) {
      continue;
    }

    qualities.push(...normalizeGenericStream(chapterRecord));

    for (const pathRecord of [
      ...collectRecordArray(chapterRecord.videoPathList),
      ...collectRecordArray(chapterRecord.playInfoList),
      ...collectRecordArray(chapterRecord.playList),
    ]) {
      qualities.push(createQualityFromRecord(pathRecord));
    }

    const cdnList = readArray(chapterRecord.cdnList) ?? [];

    for (const cdn of cdnList) {
      const cdnRecord = asRecord(cdn);

      if (!cdnRecord) {
        continue;
      }

      qualities.push(...normalizeGenericStream(cdnRecord));
      qualities.push(createQualityFromRecord(cdnRecord));

      const pathList = [
        ...collectRecordArray(cdnRecord.videoPathList),
        ...collectRecordArray(cdnRecord.playInfoList),
        ...collectRecordArray(cdnRecord.playList),
      ];

      for (const pathItem of pathList) {
        qualities.push(createQualityFromRecord(pathItem));
      }
    }
  }

  for (const candidate of candidates) {
    qualities.push(...normalizeGenericStream(candidate));
  }

  return qualities.filter(isCompleteQuality);
}

function normalizeGenericStream(data: JsonRecord | null) {
  const qualities: StreamResponse["qualities"] = [];
  const streamQualities = readArray(data?.qualities) ?? [];
  const videos = readArray(data?.videos) ?? [];
  const videoList = readArray(data?.videoList) ?? [];
  const playInfoList = readArray(data?.playInfoList) ?? [];
  const playList = readArray(data?.playList) ?? [];
  const videoPathList = readArray(data?.videoPathList) ?? [];

  for (const quality of streamQualities) {
    const entry = asRecord(quality);

    if (!entry) {
      continue;
    }

    const width = readInt(entry.width);
    const height = readInt(entry.height);
    const fallbackLabel =
      height > 0
        ? `${height}p`
        : width > 0
          ? `${width}w`
          : "Auto";

    qualities.push({
      label:
        readString(entry.label) ||
        readString(entry.quality) ||
        readString(entry.type) ||
        fallbackLabel,
      url:
        readString(entry.url) ||
        readString(entry.play_url) ||
        readString(entry.filePath) ||
        readString(entry.videoPath),
      mimeType: inferMimeType(
        readString(entry.url) ||
          readString(entry.play_url) ||
          readString(entry.filePath) ||
          readString(entry.videoPath),
      ),
    });
  }

  for (const video of videos) {
    const entry = asRecord(video);

    if (!entry) {
      continue;
    }

    qualities.push({
      label: readString(entry.quality) || readString(entry.type) || "Auto",
      url: readString(entry.url) || readString(entry.filePath),
      mimeType: inferMimeType(
        readString(entry.url) || readString(entry.filePath),
      ),
    });
  }

  for (const video of videoList) {
    const entry = asRecord(video);

    if (!entry) {
      continue;
    }

    const dpi = readInt(entry.dpi);
    const encode = readString(entry.encode);
    const fallbackLabel =
      dpi > 0 && encode ? `${dpi}p ${encode}` : dpi > 0 ? `${dpi}p` : encode || "Auto";
    const url =
      readString(entry.playUrl) ||
      readString(entry.play_url) ||
      readString(entry.url) ||
      readString(entry.filePath);

    qualities.push({
      label: fallbackLabel,
      url,
      mimeType: inferMimeType(url),
    });
  }

  for (const entry of [
    ...playInfoList.map((item) => asRecord(item)),
    ...playList.map((item) => asRecord(item)),
    ...videoPathList.map((item) => asRecord(item)),
  ].filter((item): item is JsonRecord => item !== null)) {
    qualities.push(createQualityFromRecord(entry));
  }

  const directSources: Array<[string, unknown]> = [
    ["HLS (External H.265)", data?.external_audio_h265_m3u8],
    ["HLS (External H.264)", data?.external_audio_h264_m3u8],
    ["HLS (H.265)", data?.h265_m3u8],
    ["HLS (H.264)", data?.h264_m3u8],
    ["HLS", data?.m3u8],
    ["HLS", data?.m3u8_url],
    ["HLS", data?.hls],
    ["HLS", data?.hls_url],
    ["MP4", data?.video_url],
    ["MP4", data?.videoUrl],
    ["MP4", data?.filePath],
    ["MP4", data?.videoPath],
    ["Auto", data?.playUrl],
    ["Auto", data?.play_url],
    ["Auto", data?.url],
  ];

  for (const [label, value] of directSources) {
    const url = readString(value);

    if (!url) {
      continue;
    }

    qualities.push({
      label,
      url,
      mimeType: inferMimeType(url),
    });
  }

  return qualities.filter(isCompleteQuality);
}

function flattenRecordArrays(items: unknown[], key: string) {
  return items.flatMap((item) => {
    const record = asRecord(item);
    return collectRecordArray(record?.[key]);
  });
}

function flattenNestedRecordArrays(items: unknown[], outerKey: string, innerKey: string) {
  return items.flatMap((item) => {
    const record = asRecord(item);
    const nested = readArray(record?.[outerKey]) ?? [];

    return nested.flatMap((entry) => {
      const nestedRecord = asRecord(entry);

      return [
        ...(nestedRecord ? [nestedRecord] : []),
        ...collectRecordArray(nestedRecord?.[innerKey]),
      ];
    });
  });
}

function collectRecordArray(value: unknown) {
  return (readArray(value) ?? [])
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => item !== null);
}

function createQualityFromRecord(
  entry: JsonRecord,
): StreamResponse["qualities"][number] {
  const qualityValue =
    readInt(entry.quality) ||
    readInt(entry.dpi) ||
    readInt(entry.height) ||
    readInt(entry.resolution);
  const encode =
    readString(entry.format) ||
    readString(entry.codec) ||
    readString(entry.profile) ||
    readString(entry.encode) ||
    readString(entry.type);
  const fallbackLabel =
    qualityValue > 0 && encode
      ? `${qualityValue}p ${encode}`
      : qualityValue > 0
        ? `${qualityValue}p`
        : encode || "Auto";
  const url =
    readString(entry.videoPath) ||
    readString(entry.playUrl) ||
    readString(entry.play_url) ||
    readString(entry.url) ||
    readString(entry.filePath) ||
    readString(entry.videoUrl) ||
    readString(entry.video_url) ||
    readString(entry.m3u8) ||
    readString(entry.m3u8_url) ||
    readString(entry.hls) ||
    readString(entry.hls_url);

  return {
    label: fallbackLabel,
    url,
    mimeType: inferMimeType(url),
  };
}

function normalizeSubtitles(input: unknown) {
  const subtitles = readArray(input) ?? [];

  return subtitles
    .map((subtitle) => asRecord(subtitle))
    .filter((subtitle): subtitle is JsonRecord => subtitle !== null)
    .map((subtitle) => {
      const language = readString(subtitle.language) || "und";
      const type = readString(subtitle.type);
      const label = type ? `${language} • ${type}` : language;

      return {
        label,
        language,
        url: readString(subtitle.url),
      };
    })
    .filter((subtitle) => Boolean(subtitle.url));
}

function normalizeProviderSubtitles(data: JsonRecord | null) {
  const baseSubtitles = normalizeSubtitles(data?.subtitles);
  const subtitleList = readArray(data?.subtitle_list) ?? [];

  const mappedSubtitleList = subtitleList
    .map((subtitle) => asRecord(subtitle))
    .filter((subtitle): subtitle is JsonRecord => subtitle !== null)
    .map((subtitle) => {
      const language = readString(subtitle.language) || "und";
      const type = readString(subtitle.type);
      const displayName =
        readString(subtitle.display_name) || readString(subtitle.label);
      const label = displayName || (type ? `${language} • ${type}` : language);

      return {
        label,
        language,
        url:
          readString(subtitle.vtt) ||
          readString(subtitle.url) ||
          readString(subtitle.subtitle),
      };
    })
    .filter((subtitle) => Boolean(subtitle.url));

  return [
    ...baseSubtitles,
    ...mappedSubtitleList,
  ];
}

function dedupeQualities(qualities: StreamResponse["qualities"]) {
  const seen = new Set<string>();

  return qualities.filter((quality) => {
    const key = quality.url;

    if (!quality.url || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortQualities(qualities: StreamResponse["qualities"]) {
  return [...qualities].sort((left, right) => {
    const leftScore = parseQualityScore(left);
    const rightScore = parseQualityScore(right);

    if (leftScore === rightScore) {
      return 0;
    }

    return rightScore - leftScore;
  });
}

function parseQualityScore(quality: StreamResponse["qualities"][number]) {
  const label = quality.label;
  const normalizedLabel = label.toLowerCase();
  const match = label.match(/(\d{3,4})/);
  const baseScore = match ? 10_000 + Number.parseInt(match[1], 10) : 0;
  const hasH264 =
    normalizedLabel.includes("h264") || normalizedLabel.includes("h.264");
  const hasH265 =
    normalizedLabel.includes("h265") || normalizedLabel.includes("h.265");

  if (hasH264) {
    return baseScore > 0 ? baseScore + 80 : 8_500;
  }

  if (hasH265) {
    return baseScore > 0 ? baseScore + 40 : 8_400;
  }

  if (baseScore > 0) {
    return baseScore;
  }

  if (normalizedLabel.includes("auto")) {
    return 8_300;
  }

  if (normalizedLabel.includes("hls")) {
    return 8_200;
  }

  return 0;
}

function inferMimeType(url: string): "application/x-mpegURL" | "video/mp4" {
  if (url.includes("/goodshort/play/")) {
    return "application/x-mpegURL";
  }

  return url.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4";
}

function requireStringArg(value: string | undefined, key: string) {
  if (!value) {
    throw new Error(`Missing required stream argument: ${key}.`);
  }

  return value;
}

function requireNumberArg(value: number | undefined, key: string) {
  if (typeof value !== "number") {
    throw new Error(`Missing required stream argument: ${key}.`);
  }

  return value;
}

function readMessage(payload: unknown) {
  const record = asRecord(payload);

  return (
    readString(record?.message) ||
    readString(record?.error) ||
    readString(asRecord(record?.data)?.message)
  );
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : null;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function readString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return "";
}

function readInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readMaybeInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function incrementMaybeInt(value: unknown) {
  const parsed = readMaybeInt(value);
  return typeof parsed === "number" ? parsed + 1 : null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }

  return false;
}

function readLooseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (
        typeof entry === "string" ||
        typeof entry === "number" ||
        typeof entry === "bigint"
      ) {
        return readString(entry);
      }

      const record = asRecord(entry);

      if (!record) {
        return "";
      }

      return (
        readString(record.name) ||
        readString(record.label) ||
        readString(record.tagName) ||
        readString(record.value) ||
        readString(record.display_name)
      );
    })
    .filter((entry) => Boolean(entry));
}

function mergeStringArrays(...parts: string[][]) {
  return Array.from(new Set(parts.flat().filter(Boolean)));
}

function isCompleteQuality(
  quality: StreamResponse["qualities"][number],
): quality is StreamResponse["qualities"][number] {
  return Boolean(quality.label && quality.url);
}
