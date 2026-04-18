import { normalizeDisplayImageUrl } from "@/lib/utils";

const API_BASE_URL =
  process.env.UPSTREAM_API_BASE_URL?.trim() ||
  "https://api.sonzaix.indevs.in";
const DRAMABOX_EDGE_BASE_URL =
  process.env.DRAMABOX_EDGE_BASE_URL?.trim() ||
  "https://zlcibrpnwgazvwejzjdp.supabase.co/functions/v1/dramabox";
export const DEFAULT_LANG = "id";

export const PROVIDERS = [
  "melolo",
  "meloshort",
  "goodshort",
  "dramawave",
  "dramabox",
  "reelshort",
  "freereels",
  "flickreels",
  "netshort",
] as const;

export type ProviderType = (typeof PROVIDERS)[number];
export const SYNC_SOURCES = ["home", "new", "popular"] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];

type JsonRecord = Record<string, unknown>;

type FetchJsonOptions = {
  revalidate?: number;
  timeoutMs?: number;
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

export function buildCollectionUrl(
  provider: ProviderType,
  source: SyncSource,
  page: number,
  lang = DEFAULT_LANG,
) {
  const resolvedLang = resolveProviderLang(provider, lang);
  const upstreamSource = source === "popular" ? "populer" : source;

  switch (provider) {
    case "reelshort":
      return `${API_BASE_URL}/reelshort/${upstreamSource}?lang=${encodeURIComponent(resolvedLang)}`;
    default:
      return `${API_BASE_URL}/${provider}/${upstreamSource}?page=${page}&lang=${encodeURIComponent(resolvedLang)}`;
  }
}

export function buildDetailUrl(
  provider: ProviderType,
  id: string,
  lang = DEFAULT_LANG,
) {
  const resolvedLang = resolveProviderLang(provider, lang);

  switch (provider) {
    case "melolo":
      return `${API_BASE_URL}/melolo/detail/${encodeURIComponent(id)}`;
    case "meloshort":
      return `${API_BASE_URL}/meloshort/detail?dramaId=${encodeURIComponent(id)}&lang=${encodeURIComponent(resolvedLang)}`;
    case "goodshort":
      return `${API_BASE_URL}/goodshort/detail?bookId=${encodeURIComponent(id)}&lang=${encodeURIComponent(resolvedLang)}`;
    case "dramawave":
      return `${API_BASE_URL}/dramawave/detail?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(resolvedLang)}`;
    case "dramabox":
      return `${API_BASE_URL}/dramabox/detail/${encodeURIComponent(id)}?lang=${encodeURIComponent(resolvedLang)}`;
    case "reelshort":
      return `${API_BASE_URL}/reelshort/detail?bookId=${encodeURIComponent(id)}&lang=${encodeURIComponent(resolvedLang)}`;
    case "freereels":
      return `${API_BASE_URL}/freereels/detail?dramaId=${encodeURIComponent(id)}&lang=${encodeURIComponent(resolvedLang)}`;
    case "flickreels":
      return `${API_BASE_URL}/flickreels/detail?playlet_id=${encodeURIComponent(id)}&lang=${encodeURIComponent(resolvedLang)}`;
    case "netshort":
      return `${API_BASE_URL}/netshort/detail?dramaId=${encodeURIComponent(id)}&lang=${encodeURIComponent(resolvedLang)}`;
  }
}

export function buildStreamUrl(provider: ProviderType, args: StreamBuildArgs) {
  const lang = resolveProviderLang(provider, args.lang ?? DEFAULT_LANG);

  switch (provider) {
    case "melolo":
      return `${API_BASE_URL}/melolo/stream/${encodeURIComponent(requireStringArg(args.videoId ?? args.id, "videoId"))}`;
    case "meloshort":
      return `${API_BASE_URL}/meloshort/stream?dramaId=${encodeURIComponent(requireStringArg(args.id, "id"))}&episodeId=${encodeURIComponent(requireStringArg(args.episodeId, "episodeId"))}&lang=${encodeURIComponent(lang)}`;
    case "goodshort":
      return `${API_BASE_URL}/goodshort/stream?bookId=${encodeURIComponent(requireStringArg(args.id, "id"))}&lang=${encodeURIComponent(lang)}`;
    case "dramawave":
      return `${API_BASE_URL}/dramawave/stream?dramaId=${encodeURIComponent(requireStringArg(args.id, "id"))}&episode=${encodeURIComponent(String(requireNumberArg(args.episodeIndex, "episodeIndex")))}&lang=${encodeURIComponent(lang)}`;
    case "dramabox":
      return `${API_BASE_URL}/dramabox/stream?dramaId=${encodeURIComponent(requireStringArg(args.id, "id"))}&episodeIndex=${encodeURIComponent(String(requireNumberArg(args.episodeIndex, "episodeIndex")))}&lang=${encodeURIComponent(lang)}`;
    case "reelshort":
      return `${API_BASE_URL}/reelshort/stream?bookId=${encodeURIComponent(requireStringArg(args.id, "id"))}&chapterId=${encodeURIComponent(requireStringArg(args.chapterId, "chapterId"))}&lang=${encodeURIComponent(lang)}`;
    case "freereels":
      return `${API_BASE_URL}/freereels/stream?dramaId=${encodeURIComponent(requireStringArg(args.id, "id"))}&episode=${encodeURIComponent(String(requireNumberArg(args.episodeIndex, "episodeIndex")))}&lang=${encodeURIComponent(lang)}`;
    case "flickreels":
      return `${API_BASE_URL}/flickreels/stream?playlet_id=${encodeURIComponent(requireStringArg(args.id, "id"))}&lang=${encodeURIComponent(lang)}`;
    case "netshort":
      return `${API_BASE_URL}/netshort/stream?dramaId=${encodeURIComponent(requireStringArg(args.id, "id"))}&episode=${encodeURIComponent(String(requireNumberArg(args.episodeIndex, "episodeIndex")))}&lang=${encodeURIComponent(lang)}`;
  }
}

function buildDramaboxEdgeCollectionUrl(
  source: SyncSource,
  page: number,
  lang = DEFAULT_LANG,
) {
  const resolvedLang = resolveProviderLang("dramabox", lang);
  const params = new URLSearchParams({
    page: String(page),
    lang: resolvedLang,
  });

  const sourceKey = source === "popular" ? "populer" : source;
  params.set(sourceKey, "1");

  return `${DRAMABOX_EDGE_BASE_URL}?${params.toString()}`;
}

function buildDramaboxEdgeDetailUrl(id: string, lang = DEFAULT_LANG) {
  const resolvedLang = resolveProviderLang("dramabox", lang);
  const params = new URLSearchParams({
    bookId: id,
    lang: resolvedLang,
  });

  return `${DRAMABOX_EDGE_BASE_URL}/detail?${params.toString()}`;
}

function buildDramaboxEdgeStreamUrl(args: StreamBuildArgs) {
  const lang = resolveProviderLang("dramabox", args.lang ?? DEFAULT_LANG);
  const params = new URLSearchParams({
    bookId: requireStringArg(args.id, "id"),
    episodeIndex: String(requireNumberArg(args.episodeIndex, "episodeIndex")),
    lang,
  });

  return `${DRAMABOX_EDGE_BASE_URL}/stream?${params.toString()}`;
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

  if (provider === "flickreels") {
    return {
      providerDramaId: readString(data.playlet_id),
      providerName: provider,
      title: readString(data.title),
      description: readString(data.introduce),
      thumbUrl: normalizeDisplayImageUrl(readString(data.cover)),
      episodeCount: readInt(data.upload_num),
      watchValue: readString(data.likes),
      isNewBook: false,
      tags: readStringArray(data.tags),
    };
  }

  return {
    providerDramaId: readString(data.drama_id),
    providerName: provider,
    title: readString(data.drama_name),
    description: readString(data.description),
    thumbUrl: normalizeDisplayImageUrl(readString(data.thumb_url)),
    episodeCount: readInt(data.episode_count),
    watchValue:
      readString(data.watch_value) ||
      readString(data.hot_score) ||
      readString(data.follow_count),
    isNewBook:
      readBoolean(data.is_new_book) || readBoolean(data.is_finished) || false,
    tags: readStringArray(data.tags),
  };
}

export function normalizeCollectionPayload(
  provider: ProviderType,
  payload: unknown,
): NormalizedDramaMetadata[] {
  const root = asRecord(payload);
  const data = Array.isArray(root?.data) ? root.data : [];

  if (provider === "dramabox") {
    return extractDramaboxCollectionEntries(payload)
      .map((item) => normalizeDramaMetadata(provider, item))
      .filter((item): item is NormalizedDramaMetadata => item !== null);
  }

  if (provider === "flickreels") {
    return data
      .flatMap((item) => readArray(asRecord(item)?.playlets) ?? [])
      .map((item) => normalizeDramaMetadata(provider, asRecord(item)))
      .filter((item): item is NormalizedDramaMetadata => item !== null);
  }

  const books = data.flatMap((block) => readArray(asRecord(block)?.books) ?? []);

  return books
    .map((item) => normalizeDramaMetadata(provider, asRecord(item)))
    .filter((item): item is NormalizedDramaMetadata => item !== null);
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
    case "flickreels": {
      await validateEpisodeFromDetail(provider, providerDramaId, episodeIndex, lang);

      return {
        streamArgs: {
          id: providerDramaId,
          lang,
        },
      };
    }
    case "melolo": {
      const detailData = await fetchDetailData(provider, providerDramaId, lang);
      const episode = findEpisodeEntry(detailData, episodeIndex);

      if (!episode.videoId) {
        throw new RangeError("Unable to resolve Melolo video id for episode.");
      }

      return {
        streamArgs: {
          id: providerDramaId,
          videoId: episode.videoId,
          lang,
        },
      };
    }
    case "meloshort": {
      const detailData = await fetchDetailData(provider, providerDramaId, lang);
      const episode = findEpisodeEntry(detailData, episodeIndex);

      if (!episode.episodeId) {
        throw new RangeError("Unable to resolve Meloshort episode id.");
      }

      return {
        streamArgs: {
          id: providerDramaId,
          episodeId: episode.episodeId,
          lang,
        },
      };
    }
    case "dramawave": {
      return {
        streamArgs: {
          id: providerDramaId,
          episodeIndex,
          lang,
        },
      };
    }
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
    case "reelshort": {
      const detailData = await fetchDetailData(provider, providerDramaId, lang);
      const episode = findEpisodeEntry(detailData, episodeIndex);

      if (!episode.chapterId) {
        throw new RangeError("Unable to resolve Reelshort chapter id.");
      }

      return {
        streamArgs: {
          id: providerDramaId,
          chapterId: episode.chapterId,
          lang,
        },
      };
    }
    case "freereels":
    case "netshort": {
      await validateEpisodeFromDetail(provider, providerDramaId, episodeIndex, lang);

      return {
        streamArgs: {
          id: providerDramaId,
          episodeIndex,
          lang,
        },
      };
    }
  }
}

export function normalizeStreamPayload({
  dramaId,
  provider,
  episodeIndex,
  payload,
}: NormalizeStreamPayloadArgs): StreamResponse {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const subtitles = normalizeProviderSubtitles(data);
  let qualities: StreamResponse["qualities"] = [];

  if (provider === "goodshort") {
    qualities = normalizeGoodshortStream(data, episodeIndex);
  } else if (provider === "dramabox") {
    qualities = normalizeDramaboxStream(data);
  } else if (provider === "flickreels") {
    qualities = normalizeFlickreelsStream(data, episodeIndex);
  } else {
    qualities = normalizeGenericStream(data);
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
    { revalidate: 3600 },
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
  const response = await fetch(url, {
    headers: UPSTREAM_HEADERS,
    signal: AbortSignal.timeout(options?.timeoutMs ?? 25000),
    ...(typeof options?.revalidate === "number"
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

  if (!data) {
    throw new Error("Provider payload did not contain a `data` object.");
  }

  return data;
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

  if (looksLikeDramaboxItem(dataRecord)) {
    items.push(dataRecord);
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

function normalizeDramaMetadata(
  provider: ProviderType,
  item: JsonRecord | null,
): NormalizedDramaMetadata | null {
  if (!item) {
    return null;
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

  if (provider === "flickreels") {
    const normalized = {
      providerDramaId: readString(item.id),
      providerName: provider,
      title: readString(item.title),
      description: readString(item.introduce),
      thumbUrl: normalizeDisplayImageUrl(
        readString(item.cover) || readString(item.cover_thumb),
      ),
      episodeCount: readInt(item.total_episodes) || readInt(item.upload_num),
      watchValue: readString(item.likes) || readString(item.rank),
      isNewBook: false,
      tags: readStringArray(item.tags),
    };

    return normalized.providerDramaId && normalized.title ? normalized : null;
  }

  const normalized = {
    providerDramaId: readString(item.drama_id),
    providerName: provider,
    title: readString(item.drama_name),
    description: readString(item.description),
    thumbUrl: normalizeDisplayImageUrl(readString(item.thumb_url)),
    episodeCount: readInt(item.episode_count),
    watchValue: readString(item.watch_value),
    isNewBook:
      readBoolean(item.is_new_book) || readBoolean(item.is_finished) || false,
    tags: readStringArray(item.tags),
  };

  return normalized.providerDramaId && normalized.title ? normalized : null;
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
      return index === episodeIndex - 1 || readInt(item.episode) === episodeIndex;
    });

  const multiVideos = readArray(selected?.multiVideos) ?? [];

  return multiVideos
    .map((entry) => asRecord(entry))
    .filter((entry): entry is JsonRecord => entry !== null)
    .map((entry) => ({
      label: readString(entry.type) || "Auto",
      url: readString(entry.filePath),
      mimeType: "application/x-mpegURL" as const,
    }))
    .filter(isCompleteQuality);
}

function normalizeFlickreelsStream(data: JsonRecord | null, episodeIndex: number) {
  const list = readArray(data?.list) ?? [];
  const selected = list
    .map((item) => asRecord(item))
    .find((item) => item && readInt(item.chapter_num) === episodeIndex);

  if (!selected) {
    return [];
  }

  const url = readString(selected.play_url);

  if (!url) {
    return [];
  }

  return [
    {
      label: "Auto",
      url,
      mimeType: inferMimeType(url),
    },
  ];
}

function normalizeDramaboxStream(data: JsonRecord | null) {
  const chapterList = readArray(data?.chapterList) ?? [];
  const candidates = [
    data,
    ...chapterList.map((entry) => asRecord(entry)),
    ...chapterList.map((entry) => asRecord(asRecord(entry)?.videoInfo)),
    ...chapterList.map((entry) => asRecord(asRecord(entry)?.chapterVideoInfo)),
  ].filter((entry): entry is JsonRecord => entry !== null);

  const qualities = candidates.flatMap((candidate) =>
    normalizeGenericStream(candidate),
  );

  return qualities.filter(isCompleteQuality);
}

function normalizeGenericStream(data: JsonRecord | null) {
  const qualities: StreamResponse["qualities"] = [];
  const streamQualities = readArray(data?.qualities) ?? [];
  const videos = readArray(data?.videos) ?? [];
  const videoList = readArray(data?.videoList) ?? [];

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

  const directSources: Array<[string, unknown]> = [
    ["HLS (External H.265)", data?.external_audio_h265_m3u8],
    ["HLS (External H.264)", data?.external_audio_h264_m3u8],
    ["HLS (H.265)", data?.h265_m3u8],
    ["HLS (H.264)", data?.h264_m3u8],
    ["HLS", data?.m3u8_url],
    ["MP4", data?.video_url],
    ["MP4", data?.videoUrl],
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

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readString(entry))
    .filter((entry) => Boolean(entry));
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
