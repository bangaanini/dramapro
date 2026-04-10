import { normalizeDisplayImageUrl } from "@/lib/utils";

const API_BASE_URL = "https://api.sonzaix.indevs.in";
export const DEFAULT_LANG = "id";

export const PROVIDERS = [
  "melolo",
  "meloshort",
  "goodshort",
  "dramawave",
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

export function buildCollectionUrl(
  provider: ProviderType,
  source: SyncSource,
  page: number,
  lang = DEFAULT_LANG,
) {
  const upstreamSource = source === "popular" ? "populer" : source;

  switch (provider) {
    case "reelshort":
      return `${API_BASE_URL}/reelshort/${upstreamSource}?lang=${encodeURIComponent(lang)}`;
    default:
      return `${API_BASE_URL}/${provider}/${upstreamSource}?page=${page}&lang=${encodeURIComponent(lang)}`;
  }
}

export function buildDetailUrl(
  provider: ProviderType,
  id: string,
  lang = DEFAULT_LANG,
) {
  switch (provider) {
    case "melolo":
      return `${API_BASE_URL}/melolo/detail/${encodeURIComponent(id)}`;
    case "meloshort":
      return `${API_BASE_URL}/meloshort/detail?dramaId=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
    case "goodshort":
      return `${API_BASE_URL}/goodshort/detail?bookId=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
    case "dramawave":
      return `${API_BASE_URL}/dramawave/detail?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
    case "reelshort":
      return `${API_BASE_URL}/reelshort/detail?bookId=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
    case "freereels":
      return `${API_BASE_URL}/freereels/detail?dramaId=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
    case "flickreels":
      return `${API_BASE_URL}/flickreels/detail?playlet_id=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
    case "netshort":
      return `${API_BASE_URL}/netshort/detail?dramaId=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
  }
}

export function buildStreamUrl(provider: ProviderType, args: StreamBuildArgs) {
  const lang = args.lang ?? DEFAULT_LANG;

  switch (provider) {
    case "melolo":
      return `${API_BASE_URL}/melolo/stream/${encodeURIComponent(requireStringArg(args.videoId ?? args.id, "videoId"))}`;
    case "meloshort":
      return `${API_BASE_URL}/meloshort/stream?dramaId=${encodeURIComponent(requireStringArg(args.id, "id"))}&episodeId=${encodeURIComponent(requireStringArg(args.episodeId, "episodeId"))}&lang=${encodeURIComponent(lang)}`;
    case "goodshort":
      return `${API_BASE_URL}/goodshort/stream?bookId=${encodeURIComponent(requireStringArg(args.id, "id"))}&lang=${encodeURIComponent(lang)}`;
    case "dramawave":
      return `${API_BASE_URL}/dramawave/stream?dramaId=${encodeURIComponent(requireStringArg(args.id, "id"))}&episode=${encodeURIComponent(String(requireNumberArg(args.episodeIndex, "episodeIndex")))}&lang=${encodeURIComponent(lang)}`;
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

export async function fetchProviderJson(
  kind: SyncSource | "detail" | "stream",
  provider: ProviderType,
  args: StreamBuildArgs,
  options?: FetchJsonOptions,
) {
  const url =
    kind === "home" || kind === "new" || kind === "popular"
      ? buildCollectionUrl(provider, kind, args.page ?? 1, args.lang)
      : kind === "detail"
        ? buildDetailUrl(provider, requireStringArg(args.id, "id"), args.lang)
        : buildStreamUrl(provider, args);

  return fetchJson(url, options);
}

export function normalizeDetailMetadata(
  provider: ProviderType,
  payload: unknown,
): ProviderDetailMetadata {
  const data = getDataRecord(payload);

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

function normalizeDramaMetadata(
  provider: ProviderType,
  item: JsonRecord | null,
): NormalizedDramaMetadata | null {
  if (!item) {
    return null;
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
    ...(readArray(detailData.chapter_list) ?? []),
    ...(readArray(detailData.list) ?? []),
  ]
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => item !== null);

  const match = candidates.find((item) => {
    const directEpisode =
      readInt(item.episode) ||
      readInt(item.chapter_num) ||
      readInt(item.index) ||
      readInt(item.chapterName);

    if (directEpisode === episodeIndex) {
      return true;
    }

    const zeroBasedIndex = readInt(item.index);
    return zeroBasedIndex === episodeIndex - 1;
  });

  if (!match) {
    throw new RangeError(`Episode ${episodeIndex} is out of range for this drama.`);
  }

  return {
    episodeId:
      readString(match.episode_id) ||
      readString(match.id) ||
      readString(match.chapter_id),
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

function normalizeGenericStream(data: JsonRecord | null) {
  const qualities: StreamResponse["qualities"] = [];
  const streamQualities = readArray(data?.qualities) ?? [];
  const videos = readArray(data?.videos) ?? [];

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
        readString(entry.filePath),
      mimeType: inferMimeType(
        readString(entry.url) ||
          readString(entry.play_url) ||
          readString(entry.filePath),
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

  const directSources: Array<[string, unknown]> = [
    ["HLS (External H.265)", data?.external_audio_h265_m3u8],
    ["HLS (External H.264)", data?.external_audio_h264_m3u8],
    ["HLS (H.265)", data?.h265_m3u8],
    ["HLS (H.264)", data?.h264_m3u8],
    ["HLS", data?.m3u8_url],
    ["MP4", data?.video_url],
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
    const key = `${quality.label}::${quality.url}`;

    if (!quality.url || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortQualities(qualities: StreamResponse["qualities"]) {
  return [...qualities].sort((left, right) => {
    const leftScore = parseQualityScore(left.label);
    const rightScore = parseQualityScore(right.label);

    if (leftScore === rightScore) {
      return 0;
    }

    return rightScore - leftScore;
  });
}

function parseQualityScore(label: string) {
  const match = label.match(/(\d{3,4})/);

  if (match) {
    return Number.parseInt(match[1], 10);
  }

  if (label.toLowerCase().includes("h.265")) {
    return 9000;
  }

  if (label.toLowerCase().includes("h.264")) {
    return 8000;
  }

  if (label.toLowerCase().includes("auto")) {
    return 1000;
  }

  if (label.toLowerCase().includes("hls")) {
    return 900;
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

function isCompleteQuality(
  quality: StreamResponse["qualities"][number],
): quality is StreamResponse["qualities"][number] {
  return Boolean(quality.label && quality.url);
}
