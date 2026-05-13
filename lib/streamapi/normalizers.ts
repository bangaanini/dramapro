import { makeDramaId, makeEpisodeId } from "@/lib/streamapi/content-id";
import type {
  CanonicalDrama,
  CanonicalEpisode,
  CanonicalPlayback,
  JsonRecord,
  JsonValue,
  PlaybackSource,
  PlaybackSubtitle,
  ProviderCode
} from "@/lib/streamapi/types";

const idKeys = [
  "dcup",
  "dlit",
  "cid",
  "dshame",
  "redirect_param.playletId",
  "playletId",
  "programId",
  "shortplay_id",
  "videoid",
  "fakeId",
  "compilationsFakeId",
  "compilationsId",
  "bookId",
  "book_id",
  "drama_id",
  "dramaId",
  "series_id",
  "seriesId",
  "playlet_id",
  "albumId",
  "key",
  "code",
  "id",
  "slug",
  "vid"
];

const episodeIdKeys = [
  "eholi",
  "ewash",
  "vcity",
  "episodeid",
  "episId",
  "videoFakeId",
  "episodicDramaId",
  "episodeId",
  "episode_id",
  "chapter_id",
  "chapterId",
  "chapterID",
  "section_id",
  "sectionId",
  "vid",
  "id",
  "slug",
  "fileId",
  "videoId"
];

const titleKeys = [
  "nmeasu",
  "nseri",
  "nsin",
  "playName",
  "videoName",
  "drama_title",
  "shortPlayName",
  "series_name",
  "seriesName",
  "dramaName",
  "bookName",
  "book_name",
  "book_title",
  "playlet_title",
  "title",
  "name",
  "albumName"
];

const descriptionKeys = ["dwill", "dentra", "description", "drama_description", "abstract", "desc", "playDesc", "intro", "introduce", "introduction", "summary", "brief", "special_desc"];
const providerDescriptionKeys = ["ddet", "logLine", "synopsis", "recommendIntro"];
const posterKeys = [
  "pday",
  "pbat",
  "ptear",
  "coverImgUrl",
  "coverFileUrl",
  "fileUrl",
  "cover_image",
  "cover_image_thumb.thumb",
  "images.thumbnail",
  "thumbnail",
  "images.image",
  "images.web_image",
  "images.slide_thumbnail",
  "cover",
  "poster",
  "picUrl",
  "image",
  "icon",
  "img",
  "first_chapter_cover",
  "thumb_url",
  "drama_cover",
  "drama_cover_h",
  "posterUrl",
  "coverUrl",
  "cover_url",
  "cover_key",
  "thumbnailExpanded",
  "bannerImage",
  "coverWap",
  "process_cover",
  "bookCover",
  "book_pic",
  "horizontalCoverId"
];
const episodeCountKeys = [
  "ewood",
  "ewin",
  "eshe",
  "episode_count",
  "episodeCount",
  "totalEpisodes",
  "totalEpisodeNum",
  "total_episodes",
  "uploadOfEpisodes",
  "chapter_num",
  "chapter_count",
  "chapterCount",
  "lastChapterId",
  "total",
  "episodesCount",
  "episodes",
  "episode",
  "dramaCount",
  "chapters",
  "totalChapters",
  "onlineChapter",
  "upload_num",
  "serial_count",
  "last_chapter_index",
  "playTotal"
];
const durationKeys = ["Dcol", "duration", "duration_seconds", "durationSeconds", "total_duration", "play_time"];
const catalogContainerKeys = [
  "items",
  "list",
  "data",
  "records",
  "results",
  "rows",
  "dramas",
  "floor",
  "lists",
  "series_list",
  "shortPlayResponseList",
  "bannerResponseList",
  "place_list",
  "books",
  "plays",
  "cell_data",
  "cells",
  "book_tab_infos",
  "book_data",
  "drama_data",
  "columnVoList",
  "bookList"
];
const singularCatalogContainerKeys = [
  "program",
  "videoInfo",
  "book",
  "drama",
  "series",
  "bmini"
];

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

export function firstValue(source: unknown, keys: string[]): unknown {
  for (const key of keys) {
    const value = key.includes(".") ? readPath(source, key) : asRecord(source)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return null;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function positiveEpisodeNumber(value: number | null, index: number) {
  if (value !== null && Number.isFinite(value) && value > 0) return Math.floor(value);
  return index + 1;
}

function episodeNumberFromIndexValue(value: number | null, index: number) {
  if (value === null || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized === index || normalized === 0) return index + 1;
  return normalized;
}

function episodeArray(source: unknown): unknown[] {
  const candidates = [
    readPath(source, "episodes"),
    readPath(source, "episode_list"),
    readPath(source, "chapters"),
    readPath(source, "data.episodes"),
    readPath(source, "data.episode_list"),
    readPath(source, "data.chapters"),
    readPath(source, "data")
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length && firstValue(candidate[0], episodeIdKeys)) return candidate;
  }

  return [];
}

function titleFromEpisodeList(source: unknown): string | null {
  const firstEpisode = asRecord(episodeArray(source)[0]);
  const episodeTitle = toStringValue(firstValue(firstEpisode, ["title", "name", "chapter_title", "episodeTitle", "episode_name"]));
  if (!episodeTitle) return null;

  const stripped = episodeTitle
    .replace(/\s*[-–—]\s*(?:ep(?:isode)?\s*)?\d+\s*$/i, "")
    .replace(/\s+(?:ep(?:isode)?\s*)?\d+\s*$/i, "")
    .trim();

  return stripped || episodeTitle;
}

function toBooleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return ["1", "true", "yes", "locked"].includes(value.toLowerCase());
  return false;
}

function normalizeJson(value: unknown): JsonRecord {
  return asRecord(JSON.parse(JSON.stringify(value ?? {})) as JsonValue);
}

function browserSafeImageUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.hostname === "img.shorten.watch") {
      url.hostname = "cdn.shorten.watch";
      return url.toString();
    }

    if (/^p\d+-novel-sg\.ibyteimg\.com$/.test(url.hostname) && url.pathname.endsWith(".heic")) {
      url.pathname = url.pathname.replace(/\.heic$/, ".webp");
      return url.toString();
    }
  } catch {
    return value;
  }

  return value;
}

export function normalizeLangForProvider(provider: ProviderCode, lang: string): string {
  const canonical = lang || "id-ID";
  const lower = canonical.toLowerCase();

  if (provider === "netshort") {
    if (lower === "id" || lower === "id-id") return "id_ID";
    return canonical.replace("-", "_");
  }

  if (provider === "dramanova") {
    if (lower === "id" || lower === "id-id") return "in";
  }

  if (provider === "dramabox" || provider === "rapidtv" || provider === "reelshort") {
    if (lower === "id" || lower === "id-id") return "in";
  }

  if (provider === "dramawave") {
    if (lower === "id") return "id-ID";
    return canonical;
  }

  if (provider === "flickreels") {
    if (lower === "id-id") return "id";
    return lower.split("-")[0] || "id";
  }

  if (provider === "freereels") {
    if (lower === "id") return "id-ID";
    return canonical;
  }

  if (provider === "moboreels") {
    if (lower === "id" || lower === "id-id") return "11";
    return canonical;
  }

  if (provider === "shortbox") {
    if (lower === "id-id") return "id";
    return lower.split("-")[0] || "id";
  }

  if (provider === "shortsky") {
    if (lower === "id" || lower === "id-id") return "id_id";
    return canonical.replace("-", "_").toLowerCase();
  }

  if (provider === "shortwave") {
    if (lower === "id" || lower === "id-id") return "in";
    return lower.split("-")[0] || "in";
  }

  if (provider === "snackshort") {
    if (lower === "id" || lower === "id-id") return "Indonesian";
    return canonical;
  }

  if (provider === "starshort") {
    if (lower === "id" || lower === "id-id") return "4";
    return canonical;
  }

  if (lower === "id-id") return "id";
  return lower.split("-")[0] || "id";
}

export function extractListPayload(payload: unknown): unknown[] {
  const candidates = [
    payload,
    readPath(payload, "data"),
    readPath(payload, "data.rows"),
    readPath(payload, "data.dramas"),
    readPath(payload, "data.list"),
    readPath(payload, "data.lists"),
    readPath(payload, "data.data"),
    readPath(payload, "data.data.data"),
    readPath(payload, "data.jieguo"),
    readPath(payload, "data.jieguo.slide_list"),
    readPath(payload, "data.jieguo.column_data.module_list"),
    readPath(payload, "data.dinsur"),
    readPath(payload, "data.dinsur.lconne"),
    readPath(payload, "data.items"),
    readPath(payload, "data.series"),
    readPath(payload, "data.records"),
    readPath(payload, "data.results"),
    readPath(payload, "dataResult.data"),
    readPath(payload, "dataResult.popularTvs"),
    readPath(payload, "data.columnVoList"),
    readPath(payload, "data.columnPageList"),
    readPath(payload, "data.bookList"),
    readPath(payload, "data.bookVos"),
    readPath(payload, "data.classifyBookList.records"),
    readPath(payload, "data.newTheaterList.records"),
    readPath(payload, "data.recommendList.records"),
    readPath(payload, "data.searchResult.records"),
    readPath(payload, "data.searchList"),
    readPath(payload, "data.floor"),
    readPath(payload, "data.place_list"),
    readPath(payload, "data.popular"),
    readPath(payload, "data.trendingSearches"),
    readPath(payload, "payloads"),
    readPath(payload, "compilationsInfoList"),
    readPath(payload, "forYoucompilationsList"),
    readPath(payload, "banner"),
    readPath(payload, "data.tabPageResponse.bannerResponseList"),
    readPath(payload, "data.ddriv.lsumm"),
    readPath(payload, "data.dgiv.lint"),
    readPath(payload, "rows"),
    readPath(payload, "dramas"),
    readPath(payload, "dgiv.lint"),
    readPath(payload, "ddriv.lsumm"),
    readPath(payload, "cell.books"),
    readPath(payload, "cell.cell_data"),
    readPath(payload, "book_tab_infos"),
    readPath(payload, "tabPageResponse.bannerResponseList"),
    readPath(payload, "list"),
    readPath(payload, "lists"),
    readPath(payload, "items"),
    readPath(payload, "records"),
    readPath(payload, "results"),
    readPath(payload, "trending"),
    readPath(payload, "popular"),
    readPath(payload, "newest"),
    readPath(payload, "trendingSearches")
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const items = flattenCatalogItems(candidate);
      if (items.length) return items;
    }
  }

  return [];
}

function hasDramaIdentity(value: unknown): boolean {
  const hasId = Boolean(toStringValue(firstValue(value, idKeys)));
  const hasTitle = Boolean(toStringValue(firstValue(value, titleKeys)));
  const hasPoster = Boolean(toStringValue(firstValue(value, posterKeys)));
  const hasDescription = Boolean(toStringValue(firstValue(value, descriptionKeys)));
  const hasEpisodeCount = toNumberValue(firstValue(value, episodeCountKeys)) !== null;

  return Boolean(
    (hasId && (hasTitle || hasPoster || hasDescription || hasEpisodeCount)) ||
      (hasTitle && hasPoster)
  );
}

function nestedCatalogArrays(item: unknown): unknown[][] {
  const record = asRecord(item);
  return catalogContainerKeys
    .map((key) => asArray(record[key]))
    .filter((items) => items.length > 0);
}

function nestedCatalogRecords(item: unknown): unknown[] {
  const record = asRecord(item);
  return singularCatalogContainerKeys
    .map((key) => record[key])
    .filter((value) => value && typeof value === "object" && !Array.isArray(value));
}

function flattenCatalogItems(items: unknown[], depth = 0): unknown[] {
  if (depth > 6) return items.filter(hasDramaIdentity);

  const flattened = items.flatMap((item) => {
    const nestedRecords = nestedCatalogRecords(item).flatMap((record) => flattenCatalogItems([record], depth + 1));
    const nestedItems = nestedCatalogArrays(item).flatMap((nested) => flattenCatalogItems(nested, depth + 1));
    if (nestedRecords.length > 0 || nestedItems.length > 0) {
      const nested = [...nestedRecords, ...nestedItems];
      return hasDramaIdentity(item) && !nestedCatalogArrays(item).length ? [item, ...nested] : nested;
    }
    return hasDramaIdentity(item) ? [item] : [];
  });

  return flattened;
}

export function extractDramaPayload(payload: unknown): JsonRecord {
  const candidates = [
    readPath(payload, "data.info"),
    readPath(payload, "data.detail"),
    readPath(payload, "data.drama"),
    readPath(payload, "data.series"),
    readPath(payload, "data.book"),
    readPath(payload, "data.data"),
    readPath(payload, "data.data.book"),
    readPath(payload, "data.jieguo"),
    readPath(payload, "data.dinsur.bmini"),
    readPath(payload, "dataResult.tvInfo"),
    readPath(payload, "data.dgiv.bswitc"),
    readPath(payload, "dgiv.bswitc"),
    readPath(payload, "info"),
    readPath(payload, "detail"),
    readPath(payload, "drama"),
    readPath(payload, "series"),
    readPath(payload, "book"),
    readPath(payload, "videoInfo"),
    readPath(payload, "program"),
    readPath(payload, "tvInfo"),
    readPath(payload, "data"),
    payload
  ];

  for (const candidate of candidates) {
    if (hasDramaIdentity(candidate)) return asRecord(candidate);
  }

  return asRecord(payload);
}

function extractSeasonEpisodes(payload: unknown): unknown[] {
  const seasonCandidates = [
    readPath(payload, "data.data.seasons"),
    readPath(payload, "data.seasons"),
    readPath(payload, "drama.seasons"),
    readPath(payload, "program.seasons"),
    readPath(payload, "seasons")
  ];

  for (const candidate of seasonCandidates) {
    const episodes = asArray(candidate).flatMap((season) => asArray(asRecord(season).episodes));
    if (episodes.length) return episodes;
  }

  return [];
}

export function extractEpisodesPayload(payload: unknown): unknown[] {
  const seasonEpisodes = extractSeasonEpisodes(payload);
  if (seasonEpisodes.length) return seasonEpisodes;

  const candidates = [
    payload,
    readPath(payload, "data.info.episode_list"),
    readPath(payload, "data.info.episodes"),
    readPath(payload, "data.info.chapters"),
    readPath(payload, "data.detail.episode_list"),
    readPath(payload, "data.detail.episodes"),
    readPath(payload, "data.detail.chapters"),
    readPath(payload, "data.episodes"),
    readPath(payload, "data.episode_list"),
    readPath(payload, "data.items"),
    readPath(payload, "data.list"),
    readPath(payload, "data.chapters"),
    readPath(payload, "data.chapterList"),
    readPath(payload, "data.data"),
    readPath(payload, "data.dinsur.erefu"),
    readPath(payload, "data.pageData.records"),
    readPath(payload, "data.data.episodes"),
    readPath(payload, "data.data.chapters"),
    readPath(payload, "data.data.data"),
    readPath(payload, "dataResult.tvInfo.episodesInfos"),
    readPath(payload, "data"),
    readPath(payload, "data.dgiv.ebeer"),
    readPath(payload, "dgiv.ebeer"),
    readPath(payload, "info.episode_list"),
    readPath(payload, "info.episodes"),
    readPath(payload, "info.chapters"),
    readPath(payload, "detail.episode_list"),
    readPath(payload, "detail.episodes"),
    readPath(payload, "detail.chapters"),
    readPath(payload, "episodes"),
    readPath(payload, "episodesInfo.rows"),
    readPath(payload, "episode_list"),
    readPath(payload, "episodesInfos"),
    readPath(payload, "chapters"),
    readPath(payload, "chapterList"),
    readPath(payload, "payloads"),
    readPath(payload, "list")
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  const directList = extractListPayload(payload);
  return directList;
}

export function normalizeTags(source: unknown): string[] {
  const tags = [
    ...asArray(asRecord(source).tag),
    ...asArray(asRecord(source).tags),
    ...asArray(asRecord(source).tagNames),
    ...asArray(asRecord(source).tagInfo),
    ...asArray(asRecord(source).tagList),
    ...asArray(asRecord(source).compilationsTags),
    ...asArray(asRecord(source).genres),
    ...asArray(asRecord(source).drama_tags),
    ...asArray(asRecord(source).drama_sub_tags),
    ...asArray(asRecord(source).sub_tags),
    ...asArray(asRecord(source).labels),
    ...asArray(asRecord(source).label),
    ...asArray(asRecord(source).scat),
    ...asArray(asRecord(source).labelList),
    ...asArray(asRecord(source).content_tags),
    ...asArray(asRecord(source).tag_list),
    ...asArray(asRecord(source).tag_list_with_id),
    ...asArray(asRecord(source).categoryNames),
    ...asArray(asRecord(source).categories),
    ...asArray(asRecord(source).metaTags),
    ...asArray(asRecord(source).sstra)
  ];

  const normalized = tags
    .map((tag) => {
      if (typeof tag === "string") return tag;
      if (typeof tag === "number") return String(tag);
      if (tag && typeof tag === "object") {
        return toStringValue(firstValue(tag, ["tag_name", "tagName", "name", "title", "text", "label", "static_key"]));
      }
      return null;
    })
    .filter((tag): tag is string => Boolean(tag));

  return Array.from(new Set(normalized)).slice(0, 16);
}

export function normalizeDrama(raw: unknown, provider: ProviderCode, lang: string, fallbackExternalId?: string): CanonicalDrama {
  const source = extractDramaPayload(raw);
  const externalId =
    provider === "sarostv"
      ? toStringValue(firstValue(source, ["playId", "id"])) ??
        fallbackExternalId ??
        "unknown"
      : toStringValue(firstValue(source, idKeys)) ?? fallbackExternalId ?? "unknown";
  const title = toStringValue(firstValue(source, titleKeys)) ?? titleFromEpisodeList(source) ?? `Untitled ${externalId}`;
  const statusValue = String(firstValue(source, ["status", "finish_status", "isFinished", "finished"]) ?? "").toLowerCase();
  const status = statusValue === "2" || statusValue === "completed" || statusValue === "true" ? "completed" : "unknown";
  const episodes = episodeArray(source);
  const rootEpisodes = episodes.length ? episodes : episodeArray(raw);

  return {
    id: makeDramaId({ provider, externalId, lang }),
    provider,
    externalId,
    lang,
    title,
    description: toStringValue(firstValue(source, [...descriptionKeys, ...providerDescriptionKeys])),
    posterUrl: browserSafeImageUrl(toStringValue(firstValue(source, posterKeys))),
    tags: normalizeTags(source),
    episodeCount: toNumberValue(firstValue(source, episodeCountKeys)) ?? (rootEpisodes.length ? rootEpisodes.length : null),
    status,
    rawPayload: normalizeJson(source)
  };
}

export function isValidDrama(drama: CanonicalDrama): boolean {
  return drama.externalId !== "unknown" && drama.title !== "Untitled unknown";
}

export function normalizeEpisode(
  raw: unknown,
  provider: ProviderCode,
  lang: string,
  dramaExternalId: string,
  index: number
): CanonicalEpisode {
  const source = asRecord(raw);
  const explicitEpisodeNumber =
    toNumberValue(firstValue(source, ["episode", "episodeNum", "episodeNo", "episode_no", "episodeNumber", "chapter_num", "chapterNo", "ep", "sort"])) ??
    toNumberValue(firstValue(source, ["ewheel"]));
  const indexedEpisodeNumber = episodeNumberFromIndexValue(
    toNumberValue(firstValue(source, ["index", "chapter_index", "chapterIndex", "orderNumber"])),
    index
  );
  const episodeNumber =
    positiveEpisodeNumber(explicitEpisodeNumber ?? indexedEpisodeNumber, index);
  const externalId = toStringValue(firstValue(source, episodeIdKeys)) ?? String(episodeNumber);
  const dramaId = makeDramaId({ provider, externalId: dramaExternalId, lang });
  const title = toStringValue(firstValue(source, ["title", "name", "chapter_title", "chapter_name", "chapterName", "episodeTitle", "episode_name"]));
  const isLocked = toBooleanValue(firstValue(source, ["isLocked", "isLock", "is_lock", "locked", "lock", "is_need_pay", "need_pay", "need_unlock", "needUnlock", "is_paid", "isPaid", "isVip", "is_vip", "isVipEpisode", "is_vip_episode", "isCharge", "isPay", "chargeChapter"]));

  return {
    id: makeEpisodeId({
      provider,
      externalId: dramaExternalId,
      lang,
      episodeExternalId: externalId,
      episodeNumber
    }),
    dramaId,
    provider,
    dramaExternalId,
    externalId,
    episodeNumber,
    title,
    thumbnailUrl: browserSafeImageUrl(toStringValue(firstValue(source, ["pday", "cover", "thumbnail", "thumb", "chapter_cover", "chapterImg", "first_frame", "snapshot", "poster"]))),
    duration: toNumberValue(firstValue(source, durationKeys)),
    isLocked,
    rawPayload: normalizeJson(source)
  };
}

function qualityFromUrl(url: string, fallback: string): string {
  const match = url.match(/(1080|720|540|480|360)p?/i);
  return match ? `${match[1]}p` : fallback;
}

function qualityFromPlaybackRecord(record: JsonRecord, url: string, fallback: string): string {
  const directQuality = toStringValue(firstValue(record, ["Dcoura", "Dbag", "quality", "Quality", "qualityName", "definition", "Definition", "codeRate", "name"]));
  if (directQuality) return directQuality;

  const height = toNumberValue(firstValue(record, ["height", "Height", "resolution", "Hdet", "Hhou", "Wspare", "Wroll", "Dpi"]));
  if (height) return `${height}p`;

  return qualityFromUrl(url, fallback);
}

function inferMime(url: string) {
  if (url.includes(".m3u8")) return "application/vnd.apple.mpegurl";
  if (url.includes(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

function inferMimeFromRecord(record: JsonRecord, url: string) {
  const format = toStringValue(firstValue(record, ["Famo", "format", "Format", "mimeType", "type"]))?.toLowerCase();
  if (format === "mp4" || format === "video/mp4") return "video/mp4";
  if (format === "hls" || format === "m3u8" || format === "application/vnd.apple.mpegurl") return "application/vnd.apple.mpegurl";
  const urlMime = inferMime(url);
  if (urlMime === "application/vnd.apple.mpegurl") return urlMime;
  if ((toStringValue(record.url) || toStringValue(record.stream_url) || toStringValue(record.streamUrl)) && (toNumberValue(record.size) || toNumberValue(record.duration))) return "video/mp4";
  return urlMime;
}

function inferSourceType(sources: PlaybackSource[]) {
  if (sources.some((source) => source.mimeType === "application/vnd.apple.mpegurl")) return "hls" as const;
  if (sources.some((source) => source.mimeType === "video/mp4")) return "mp4" as const;
  if (sources.length > 0) return "mp4" as const;
  return null;
}

function applyTencentVodDrmToken(url: string, drmToken: string | null) {
  if (!drmToken || !url.includes(".m3u8") || url.includes("/voddrm.token.")) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/");
    const filename = pathParts.pop();

    if (!filename || !filename.endsWith(".m3u8")) {
      return url;
    }

    pathParts.push(`voddrm.token.${drmToken}.${filename}`);
    parsedUrl.pathname = pathParts.join("/");
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

function collectSources(playback: JsonRecord, expiresAt: string | null): PlaybackSource[] {
  const sources: PlaybackSource[] = [];
  const drmToken = toStringValue(playback.drmToken);
  const hlsKey = toStringValue(readPath(playback, "drm.key"));
  const qualityMap = {
    ...asRecord(playback.qualities),
    ...asRecord(playback.video),
    ...asRecord(playback.m3u8s)
  };
  const hasQualityMap = Object.values(qualityMap).some((value) =>
    Boolean(toStringValue(value)),
  );
  const directCandidates = [
    ["Mcurr", "auto", "h264"],
    ["Bdesi", "auto", "h264"],
    ["hls_url", "auto", "h264"],
    ["m3u8_url", "auto", "h265"],
    ["h264", "720p", "h264"],
    ["h265", "720p", "h265"],
    ["video", "auto", null],
    ["mediaUrl", "auto", null],
    ["video_url", "auto", "h264"],
    ["videoAddress", "auto", null],
    ["videoPath", "auto", null],
    ["playUrl", "auto", null],
    ["linkUrl", "auto", null],
    ["MainPlayUrl", "auto", null],
    ["BackupPlayUrl", "auto", null],
    ["signPlayUrlH264", "720p", "h264"],
    ["signPlayUrl", "720p", null],
    ["bkSignPlayUrl", "720p", "h264"],
    ["jxSignH264", "720p", "h264"],
    ["jxSignH265", "720p", "h265"],
    ["hdUrl", "720p", null],
    ["fdUrl", "540p", null],
    ["sdUrl", "480p", null],
    ["ldUrl", "360p", null],
    ["sd264Url", "480p", "h264"],
    ["ld264Url", "360p", "h264"],
    ["sd265Url", "480p", "h265"],
    ["ld265Url", "360p", "h265"],
    ["mp41080p", "1080p", null],
    ["mp4720p", "720p", null],
    ["mp4540p", "540p", null],
    ["mp4360p", "360p", null],
    ["external_audio_h264_m3u8", "auto", "h264"],
    ["external_audio_h265_m3u8", "auto", "h265"],
    ["Mopp", "auto", "h264"],
    ["Bcold", "auto", "h264"],
    ["url", "auto", null],
    ["play_url", "auto", null],
    ["play_url_720p", "720p", null],
    ["main_url", "auto", null],
    ["backup_url", "auto", null],
    ["videoUrl", "auto", null],
    ["stream_url", "auto", null],
    ["streamUrl", "auto", null]
  ] as const;

  for (const [key, quality, codec] of directCandidates) {
    if (key === "video" && hasQualityMap) continue;
    const rawUrl = toStringValue(playback[key]);
    if (!rawUrl) continue;
    const url = applyTencentVodDrmToken(rawUrl, drmToken);
    sources.push({
      url,
      quality: qualityFromUrl(url, quality),
      mimeType: inferMimeFromRecord(playback, url),
      codec,
      expiresAt
    });
  }

  for (const [qualityKey, value] of Object.entries(qualityMap)) {
    const rawUrl = toStringValue(value);
    if (!rawUrl) continue;
    const url = applyTencentVodDrmToken(rawUrl, drmToken);
    const quality = /^\d+$/.test(qualityKey) ? `${qualityKey}p` : qualityKey;
    sources.push({
      url,
      quality: qualityFromUrl(url, quality),
      mimeType: inferMimeFromRecord(playback, url),
      codec: null,
      expiresAt
    });
  }

  for (const chapter of asArray(playback.chapterList)) {
    for (const cdn of asArray(asRecord(chapter).cdnList)) {
      for (const item of asArray(asRecord(cdn).videoPathList)) {
        const record = asRecord(item);
        const rawUrl = toStringValue(record.videoPath);
        if (!rawUrl) continue;
        const url = applyTencentVodDrmToken(rawUrl, drmToken);
        const qualityNumber = toNumberValue(record.quality);
        const quality = qualityNumber ? `${qualityNumber}p` : qualityFromPlaybackRecord(record, url, "auto");
        sources.push({
          url,
          quality,
          mimeType: inferMimeFromRecord(record, url),
          codec: toStringValue(record.codec),
          expiresAt
        });
      }
    }
  }

  for (const item of [
    ...asArray(playback.videos),
    ...asArray(playback.streams),
    ...asArray(playback.servers),
    ...asArray(playback.chapterContentList),
    ...asArray(playback.adaptive),
    ...asArray(playback.linkInfo),
    ...asArray(playback.episMedia),
    ...asArray(playback.videoFiles),
    ...asArray(playback.play_info_list),
    ...asArray(playback.ffile),
    ...asArray(playback.ppoem),
    ...asArray(playback.pphys),
    ...asArray(playback.funi)
  ]) {
    const record = asRecord(item);
    const url =
      toStringValue(record.Mcurr) ??
      toStringValue(record.Bdesi) ??
      toStringValue(record.Mopp) ??
      toStringValue(record.Bcold) ??
      toStringValue(record.url) ??
      toStringValue(record.videoAddress) ??
      toStringValue(record.linkUrl) ??
      toStringValue(record.PlayURL) ??
      toStringValue(record.MainPlayUrl) ??
      toStringValue(record.BackupPlayUrl) ??
      toStringValue(record.play_url) ??
      toStringValue(record.play_url_720p) ??
      toStringValue(record.main_url) ??
      toStringValue(record.backup_url) ??
      toStringValue(record.stream_url) ??
      toStringValue(record.streamUrl) ??
      toStringValue(record.videoPath) ??
      toStringValue(record.videoUrl) ??
      toStringValue(record.mediaUrl) ??
      toStringValue(record.playUrl) ??
      toStringValue(record.h264) ??
      toStringValue(record.h265) ??
      toStringValue(record.hdUrl) ??
      toStringValue(record.fdUrl) ??
      toStringValue(record.sdUrl) ??
      toStringValue(record.ldUrl) ??
      toStringValue(record.sd264Url) ??
      toStringValue(record.ld264Url) ??
      toStringValue(record.sd265Url) ??
      toStringValue(record.ld265Url) ??
      toStringValue(record.signPlayUrlH264) ??
      toStringValue(record.signPlayUrl) ??
      toStringValue(record.bkSignPlayUrl) ??
      toStringValue(record.jxSignH264) ??
      toStringValue(record.jxSignH265) ??
      toStringValue(record.mp41080p) ??
      toStringValue(record.mp4720p) ??
      toStringValue(record.mp4540p) ??
      toStringValue(record.mp4360p) ??
      toStringValue(record.hls_url) ??
      toStringValue(record.m3u8_url);
    if (!url) continue;
    const sourceUrl = applyTencentVodDrmToken(url, drmToken);
    const quality = qualityFromPlaybackRecord(record, url, "auto");
    sources.push({
      url: sourceUrl,
      quality,
      mimeType: inferMimeFromRecord(record, sourceUrl),
      codec: toStringValue(record.codec) ?? toStringValue(record.Codec) ?? toStringValue(record.codeType) ?? toStringValue(record.Cstrat) ?? toStringValue(record.Ctan) ?? toStringValue(record.Encode),
      expiresAt
    });
  }

  const seen = new Set<string>();
  return sources
    .filter((source) => {
      const key = `${source.quality}:${source.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((source) =>
      hlsKey && source.mimeType === "application/vnd.apple.mpegurl"
        ? { ...source, hlsKey }
        : source,
    );
}

function collectSubtitles(playback: JsonRecord): PlaybackSubtitle[] {
  const rawSubtitles = [
    ...asArray(playback.subtitle_list),
    ...asArray(playback.subtitleList),
    ...asArray(playback.subtitles),
    ...asArray(playback.sublist),
    ...asArray(playback.videoCaption),
    ...asArray(playback.vtt_list)
  ];
  const directSubtitleUrl = toStringValue(playback.textTrackUrl) ?? toStringValue(playback.zimu);

  const subtitles = rawSubtitles
    .map((item) => {
      const record = asRecord(item);
      const url = toStringValue(record.vtt) ?? toStringValue(record.subtitle) ?? toStringValue(record.zimu) ?? toStringValue(record.url);
      if (!url) return null;
      const formatValue = toStringValue(record.format)?.toLowerCase();
      const cleanUrl = url.split("?")[0].toLowerCase();
      const cloudflareCaption = /cloudflarestream\.com\/.+\/captions\/[^/?#]+$/.test(cleanUrl);
      const format =
        formatValue === "webvtt" || cleanUrl.endsWith(".vtt") || cloudflareCaption
          ? "vtt"
          : cleanUrl.endsWith(".srt")
            ? "srt"
            : "unknown";
      const lang = normalizeSubtitleLang(toStringValue(record.language) ?? toStringValue(record.language_code) ?? toStringValue(record.lang) ?? "und");
      return {
        lang,
        label: toStringValue(record.display_name) ?? toStringValue(record.displayName) ?? toStringValue(record.languageDisplayName) ?? toStringValue(record.label) ?? lang,
        url,
        format
      } satisfies PlaybackSubtitle;
    })
    .filter((item): item is PlaybackSubtitle => Boolean(item));

  if (directSubtitleUrl) {
    const cleanUrl = directSubtitleUrl.split("?")[0].toLowerCase();
    subtitles.unshift({
      lang: normalizeSubtitleLang(toStringValue(playback.languageCode) ?? toStringValue(playback.lang) ?? "id"),
      label: "id",
      url: directSubtitleUrl,
      format: cleanUrl.endsWith(".vtt") ? "vtt" : cleanUrl.endsWith(".srt") ? "srt" : "unknown"
    });
  }

  return subtitles;
}

function normalizeSubtitleLang(lang: string) {
  const normalized = lang.trim().replace(/_/g, "-");
  const lower = normalized.toLowerCase();
  if (lower === "ind-id" || lower === "in-id" || lower === "id-id") return "id-ID";
  if (lower === "ind" || lower === "in") return "id";
  return normalized || "und";
}

function expiresFromProvider(playback: JsonRecord): string | null {
  const timeout = toNumberValue(firstValue(playback, [
    "hls_timeout",
    "expires_at",
    "expire_at",
    "expireTime",
    "expires",
    "Egran",
    "play_url_expire_absolute_time",
    "playUrlExpireAbsoluteTime"
  ]));
  if (timeout && timeout > 0) {
    return new Date(timeout > 10_000_000_000 ? timeout : timeout * 1000).toISOString();
  }

  const seconds = toNumberValue(firstValue(playback, ["hls_time_left", "ttl", "expiresIn", "validFor"]));
  if (seconds && seconds > 0) {
    return new Date(Date.now() + seconds * 1000).toISOString();
  }

  return null;
}

export function normalizePlayback(
  raw: unknown,
  provider: ProviderCode,
  episodeId: string,
  rawEpisode?: JsonRecord
): CanonicalPlayback {
  const data = readPath(raw, "data");
  const dinsur = readPath(raw, "data.dinsur");
  const playbackCandidates = [
    readPath(raw, "data.jieguo"),
    readPath(raw, "data.data"),
    Array.isArray(dinsur) ? dinsur[0] : undefined,
    readPath(raw, "payload"),
    Array.isArray(raw) ? raw[0] : undefined,
    data && !Array.isArray(data) ? data : raw
  ];
  const playback = asRecord(playbackCandidates.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate)));
  const merged = { ...rawEpisode, ...playback };
  const expiresAt = expiresFromProvider(merged);
  const sources = collectSources(merged, expiresAt).sort((a, b) => {
    if (a.codec === "h264" && b.codec !== "h264") return -1;
    if (a.codec !== "h264" && b.codec === "h264") return 1;
    return Number.parseInt(b.quality, 10) - Number.parseInt(a.quality, 10);
  });
  const locked = toBooleanValue(firstValue(merged, ["isLocked", "is_lock", "is_need_pay", "need_pay", "locked", "isCharge", "isPay", "chargeChapter"]));

  return {
    episodeId,
    provider,
    status: sources.length > 0 ? "ready" : locked ? "locked" : "unavailable",
    sourceType: inferSourceType(sources),
    sources,
    subtitles: collectSubtitles(merged),
    duration: toNumberValue(firstValue(merged, durationKeys)),
    expiresAt,
    providerMeta: normalizeJson({
      provider,
      hls_time_left: merged.hls_time_left ?? null,
      hls_timeout: merged.hls_timeout ?? null,
      drmToken: merged.drmToken ?? null,
      playerSign: merged.playerSign ?? null
    })
  };
}
