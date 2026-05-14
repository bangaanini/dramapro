import { normalizeSubtitleToVtt } from "@/lib/subtitles";
import { fetchProviderJson, fetchProviderText } from "@/lib/streamapi/http";
import { providerCatalogSections } from "@/lib/streamapi/catalog-sections";
import {
  asRecord,
  extractEpisodesPayload,
  extractListPayload,
  normalizeDrama,
  normalizeEpisode,
  normalizeLangForProvider,
  normalizePlayback,
  isValidDrama
} from "@/lib/streamapi/normalizers";
import type {
  CanonicalPlayback,
  CatalogInput,
  CatalogSectionDefinition,
  DramaInput,
  EpisodesInput,
  JsonRecord,
  PlaybackInput,
  PlaybackSource,
  PlaybackSubtitle,
  ProviderAdapter,
  ProviderCatalogResult,
  ProviderCode
} from "@/lib/streamapi/types";

interface ProviderEndpoint {
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
}

interface ProviderConfig {
  code: ProviderCode;
  name: string;
  baseUrl: string;
  defaultSection: string;
  supportedSections: string[];
  catalogSections: CatalogSectionDefinition[];
  catalog(input: CatalogInput, lang: string): ProviderEndpoint;
  drama(input: DramaInput, lang: string): ProviderEndpoint;
  episodes(input: EpisodesInput, lang: string): ProviderEndpoint;
  playback?: (input: PlaybackInput, lang: string) => ProviderEndpoint | null;
}

export class ProviderEmptyDramaPayloadError extends Error {
  constructor(
    readonly provider: ProviderCode,
    readonly externalId: string
  ) {
    super(`Provider ${provider} returned empty drama payload for ${externalId}`);
  }
}

function isEmptyProviderPayload(payload: unknown) {
  if (Array.isArray(payload)) return payload.length === 0;
  if (payload && typeof payload === "object") return Object.keys(payload).length === 0;
  return payload === null || payload === undefined || payload === "";
}

function numberOr(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function numberParam(input: CatalogInput, name: string, fallback: number) {
  const value = input.params?.[name];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function numberInputParam(input: { params?: JsonRecord }, name: string, fallback: number) {
  const value = input.params?.[name];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function stringParam(input: CatalogInput, name: string, fallback: string) {
  const value = input.params?.[name];
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function optionalStringParam(input: CatalogInput, name: string) {
  const value = input.params?.[name];
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function stringRecordValue(record: JsonRecord, key: string) {
  const value = record[key];
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function booleanRecordValue(record: JsonRecord, key: string) {
  const value = record[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}

function numberRecordValue(record: JsonRecord, key: string) {
  const value = record[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function parsedJsonRecordValue(record: JsonRecord, key: string) {
  const value = record[key];
  if (!value || typeof value !== "string") return {};

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function isDramawaveUnplayablePreview(item: unknown) {
  const record = asRecord(item);
  const listingTime = numberRecordValue(record, "listing_time");
  const rInfo = asRecord(record.r_info);
  const rInfo1 = parsedJsonRecordValue(record, "r_info1");
  const sceneSource =
    stringRecordValue(rInfo, "scene_source") ??
    stringRecordValue(rInfo1, "scene_source") ??
    "";

  return (
    booleanRecordValue(record, "is_preview") ||
    Boolean(listingTime && listingTime > Date.now() / 1000) ||
    sceneSource.includes("coming_soon")
  );
}

function shouldSkipCatalogItem(provider: ProviderCode, item: unknown) {
  return provider === "dramawave" && isDramawaveUnplayablePreview(item);
}

function selectMeloloPlaybackPayload(payload: JsonRecord, input: PlaybackInput) {
  const episodes = Array.isArray(payload.episodes) ? payload.episodes : [];
  const selected = episodes
    .map((item) => asRecord(item))
    .find((episode) => {
      const vid = stringRecordValue(episode, "vid");
      const index = Number(stringRecordValue(episode, "index"));
      return vid === input.episodeExternalId || index === input.episodeNumber;
    });

  return selected ? { ...payload, ...selected } : payload;
}

function selectShortenPlaybackPayload(payload: JsonRecord, input: PlaybackInput) {
  const selected = extractEpisodesPayload(payload)
    .map((item) => asRecord(item))
    .filter((episode) => String(episode.type ?? "").toLowerCase() !== "teaser")
    .find((episode) => {
      const hash = stringRecordValue(episode, "hash");
      const number =
        numberRecordValue(episode, "number") ??
        numberRecordValue(episode, "episode") ??
        numberRecordValue(episode, "episodeNumber");

      return hash === input.episodeExternalId || number === input.episodeNumber;
    });

  return selected ? { ...payload, ...selected } : payload;
}

function flexTab(section: string) {
  const tabs: Record<string, number> = {
    popular: 1,
    fokus: 1,
    new: 2,
    baru: 2,
    chart: 3,
    ranking: 3,
    original: 6,
    female: 7,
    male: 9,
    anime: 11
  };
  return tabs[section] ?? numberOr(section, 1);
}

function goodshortChannel(lang: string) {
  const lower = lang.toLowerCase();
  if (lower.startsWith("pt")) return 564;
  if (lower.startsWith("ko")) return 565;
  if (lower.startsWith("th")) return 568;
  return 562;
}

function goodshortPlaybackFromRawEpisode(input: PlaybackInput): CanonicalPlayback | null {
  const raw = asRecord(input.rawEpisode);
  const cdnList = Array.isArray(raw.cdnList) ? raw.cdnList : [];
  const sources: PlaybackSource[] = [];

  for (const item of cdnList) {
    const record = asRecord(item);
    const url = stringRecordValue(record, "videoPath");
    if (!url) continue;
    sources.push({
      url,
      quality: "720p",
      mimeType: "application/vnd.apple.mpegurl",
      codec: null,
      expiresAt: null
    });
  }

  if (sources.length === 0) return null;

  return {
    episodeId: input.episodeId,
    provider: "goodshort",
    status: "ready",
    sourceType: "hls",
    sources,
    subtitles: [],
    duration: numberRecordValue(raw, "playTime"),
    expiresAt: null,
    providerMeta: { provider: "goodshort", source: "rawEpisode.cdnList" }
  };
}

function freereelsSection(section: string) {
  const sections = new Set(["foryou", "popular", "new", "female", "male", "anime", "dubbing", "coming-soon"]);
  return sections.has(section) ? section : "foryou";
}

function flickreelsSection(section: string) {
  const routes: Record<string, string> = {
    "for-you": "/api/v1/for-you",
    foryou: "/api/v1/for-you",
    popular: "/api/v1/for-you",
    "hot-rank": "/api/v1/hot-rank",
    rank: "/api/v1/hot-rank",
    navigation: "/api/v1/navigation",
    category: "/api/v1/category",
    search: "/api/v1/search",
    banners: "/api/v1/banners"
  };
  return routes[section] ?? "/api/v1/for-you";
}

function dramaboxCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  const page = numberParam(input, "page", input.page);

  if (input.section === "new") {
    return { path: "/?new", query: { page, lang } };
  }

  if (input.section === "populer") {
    return { path: "/?populer", query: { page, lang } };
  }

  if (input.section === "rank") {
    return { path: "/?rank", query: { lang } };
  }

  if (input.section === "search") {
    return {
      path: "/",
      query: {
        search: stringParam(input, "query", "cinta"),
        page,
        lang
      }
    };
  }

  if (input.section === "category-cina" || input.section === "category-korea" || input.section === "category") {
    const category =
      input.section === "category-cina"
        ? "cina"
        : input.section === "category-korea"
          ? "korea"
          : stringParam(input, "category", "cina");
    return {
      path: "/",
      query: {
        category,
        page,
        lang
      }
    };
  }

  return { path: "/?home", query: { page, lang } };
}

function netshortCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  const page = numberParam(input, "page", input.page);
  const clean = input.section.toLowerCase();
  if (clean.startsWith("tab:")) {
    return { path: `/api/v1/tab/${encodeURIComponent(clean.slice(4))}/${page}`, query: { lang } };
  }
  if (clean === "tab") {
    return { path: `/api/v1/tab/${encodeURIComponent(stringParam(input, "tabId", "1894702358019043329"))}/${page}`, query: { lang } };
  }
  if (clean === "category") {
    const tagId = optionalStringParam(input, "tagId");
    return {
      path: `/api/v1/category/${page}`,
      query: {
        lang,
        region: stringParam(input, "region", "0"),
        audio: stringParam(input, "audio", "0"),
        ...(tagId ? { tagId } : {})
      }
    };
  }
  if (clean === "search") {
    return {
      path: `/api/v1/search/${encodeURIComponent(stringParam(input, "query", "cinta"))}/${page}`,
      query: { lang }
    };
  }
  const supported = new Set(["feed", "explore", "new", "dubbing", "vip"]);
  const route = supported.has(clean) ? clean : "feed";
  return { path: `/api/v1/${route}/${page}`, query: { lang } };
}

function numericLangId(lang: string, fallback = 11) {
  return numberOr(lang, fallback);
}

function bilitvCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/v1/search",
      query: { q: stringParam(input, "query", "cinta"), lang }
    };
  }

  if (input.section === "recommend") {
    return { path: "/api/v1/recommend", query: { lang } };
  }

  if (input.section === "dramas") {
    return {
      path: "/api/v1/dramas",
      query: {
        lang,
        page: numberParam(input, "page", input.page),
        size: numberParam(input, "size", input.pageSize ?? 20)
      }
    };
  }

  return {
    path: "/api/v1/home",
    query: {
      lang,
      page: numberParam(input, "page", input.page),
      limit: numberParam(input, "limit", input.pageSize ?? 20)
    }
  };
}

function cubetvCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/search",
      query: {
        page: numberParam(input, "page", input.page),
        pageSize: numberParam(input, "pageSize", input.pageSize ?? 20),
        lang
      }
    };
  }

  return {
    path: "/shows",
    query: {
      page: numberParam(input, "page", input.page),
      lang
    }
  };
}

function moboreelsCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "channel-detail") {
    return {
      path: "/api/channelDetail",
      query: {
        channelId: numberParam(input, "channelId", 1),
        langId: numericLangId(lang)
      }
    };
  }

  return {
    path: "/api/hotList",
    query: {
      listId: numberParam(input, "listId", input.section === "latest" ? 11 : 10),
      langId: numericLangId(lang)
    }
  };
}

function radreelsCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "home") {
    return { path: "/api/v1/home", query: { lang } };
  }

  if (input.section === "foryou") {
    return {
      path: "/api/v1/foryou",
      query: { page: numberParam(input, "page", input.page), lang }
    };
  }

  if (input.section === "tab") {
    return {
      path: `/api/v1/tab/${numberParam(input, "tabId", 1)}`,
      query: {
        page: numberParam(input, "page", input.page),
        size: numberParam(input, "size", input.pageSize ?? 20),
        lang
      }
    };
  }

  return { path: "/api/v1/ranking", query: { lang } };
}

function sarostvCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/series/search",
      query: { q: stringParam(input, "query", "cinta") }
    };
  }

  if (input.section === "theater") {
    return { path: "/api/theater", query: { lang } };
  }

  return { path: "/api/recommend", query: { lang } };
}

function shortboxCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/search",
      query: {
        q: stringParam(input, "query", "cinta"),
        page: numberParam(input, "page", input.page),
        page_size: numberParam(input, "page_size", input.pageSize ?? 20),
        is_fuzzy: numberParam(input, "is_fuzzy", 1),
        languages: lang
      }
    };
  }

  if (input.section === "new-list") {
    return {
      path: "/api/new-list",
      query: {
        page: numberParam(input, "page", input.page),
        page_size: numberParam(input, "page_size", input.pageSize ?? 20),
        languages: lang
      }
    };
  }

  return {
    path: "/api/list",
    query: {
      page: numberParam(input, "page", input.page),
      page_size: numberParam(input, "page_size", input.pageSize ?? 20),
      sort_type: numberParam(input, "sort_type", 1),
      languages: lang
    }
  };
}

function shortenCatalog(input: CatalogInput): ProviderEndpoint {
  const route = ["editors", "exclusive", "dubbed", "releases", "explore"].includes(input.section)
    ? input.section
    : "editors";
  const query =
    route === "explore"
      ? {}
      : {
          page: numberParam(input, "page", input.page),
          perPage: numberParam(input, "perPage", input.pageSize ?? 20)
        };

  return { path: `/api/v1/${route}`, query };
}

function shortmaxCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/v1/search",
      query: { q: stringParam(input, "query", "cinta"), page: numberParam(input, "page", input.page), lang }
    };
  }

  if (input.section === "home") {
    return { path: "/api/v1/home", query: { tab: stringParam(input, "tab", "recommend"), lang } };
  }

  if (input.section === "foryou") {
    return { path: "/api/v1/foryou", query: { page: numberParam(input, "page", input.page), lang } };
  }

  const feed = ["recommend", "vip", "new", "ranked", "war", "epic", "romance"].includes(input.section)
    ? input.section
    : "recommend";
  return { path: `/api/v1/feed/${feed}`, query: { lang } };
}

function shortskyCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return { path: "/api/search", query: { q: stringParam(input, "query", "cinta"), lang } };
  }

  return {
    path: input.section === "recommend" ? "/api/recommend" : "/api/home",
    query: { lang }
  };
}

function shortwaveCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return { path: `/api/search/${encodeURIComponent(stringParam(input, "query", "cinta"))}`, query: { lang } };
  }

  if (input.section === "more") {
    return {
      path: "/api/more",
      query: {
        page: numberParam(input, "page", input.page),
        page_size: numberParam(input, "page_size", input.pageSize ?? 20),
        lang
      }
    };
  }

  const route = ["top", "all", "rankings"].includes(input.section) ? input.section : "top";
  return { path: `/api/${route}`, query: { lang } };
}

function shotshortCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/search",
      query: {
        q: stringParam(input, "query", "cinta"),
        page: numberParam(input, "page", input.page),
        limit: numberParam(input, "limit", input.pageSize ?? 20),
        lang
      }
    };
  }

  if (input.section === "category") {
    return {
      path: "/api/category",
      query: {
        category: stringParam(input, "category", "Romance"),
        page: numberParam(input, "page", input.page),
        limit: numberParam(input, "limit", input.pageSize ?? 20),
        lang
      }
    };
  }

  return {
    path: "/api/popular",
    query: {
      page: numberParam(input, "page", input.page),
      limit: numberParam(input, "limit", input.pageSize ?? 20),
      lang
    }
  };
}

function snackshortCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/v1/search",
      query: {
        q: stringParam(input, "query", "cinta"),
        page: numberParam(input, "page", input.page),
        limit: numberParam(input, "limit", input.pageSize ?? 20),
        lang
      }
    };
  }

  if (input.section === "browsing") {
    return {
      path: "/api/v1/browsing",
      query: {
        page: numberParam(input, "page", input.page),
        pageSize: numberParam(input, "pageSize", input.pageSize ?? 20),
        lang
      }
    };
  }

  return { path: "/api/v1/home", query: { lang } };
}

function sodareelsCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return { path: "/api/v1/search", query: { q: stringParam(input, "query", "cinta"), lang } };
  }

  if (input.section === "category") {
    return {
      path: "/api/v1/category",
      query: {
        cat: stringParam(input, "cat", "UNLIMIT"),
        page: numberParam(input, "page", input.page),
        count: numberParam(input, "count", input.pageSize ?? 20),
        lang
      }
    };
  }

  return {
    path: "/api/v1/home",
    query: {
      page: numberParam(input, "page", input.page),
      count: numberParam(input, "count", input.pageSize ?? 20),
      lang
    }
  };
}

function stardusttvCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return { path: "/api/v1/search", query: { q: stringParam(input, "query", "cinta"), page: numberParam(input, "page", input.page), lang } };
  }

  if (input.section === "category") {
    return {
      path: `/api/v1/category/${numberParam(input, "categoryId", 0)}`,
      query: { page: numberParam(input, "page", input.page), page_size: numberParam(input, "page_size", input.pageSize ?? 20), lang }
    };
  }

  return { path: "/api/v1/homepage", query: { lang } };
}

function starshortCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/v1/dramas/search",
      query: { q: stringParam(input, "query", "cinta"), page: numberParam(input, "page", input.page), limit: numberParam(input, "limit", input.pageSize ?? 20), lang }
    };
  }

  return {
    path: input.section === "new" ? "/api/v1/dramas/new" : "/api/v1/dramas",
    query: { page: numberParam(input, "page", input.page), limit: numberParam(input, "limit", input.pageSize ?? 20), lang }
  };
}

function veloloCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/dramas",
      query: {
        q: stringParam(input, "query", "cinta"),
        page: numberParam(input, "page", input.page),
        limit: numberParam(input, "limit", input.pageSize ?? 20),
        lang
      }
    };
  }

  return {
    path: input.section === "new" ? "/new" : "/hot",
    query: { page: numberParam(input, "page", input.page), limit: numberParam(input, "limit", input.pageSize ?? 20), lang }
  };
}

function viglooCatalog(input: CatalogInput, lang: string): ProviderEndpoint {
  if (input.section === "search") {
    return {
      path: "/api/v1/search",
      query: { q: stringParam(input, "query", "love"), limit: numberParam(input, "limit", input.pageSize ?? 20), lang }
    };
  }

  if (input.section === "rank") {
    return { path: "/api/v1/rank", query: { lang } };
  }

  if (input.section === "tab") {
    const tabId = stringParam(input, "tabId", "15000101");
    return {
      path: `/api/v1/tabs/${encodeURIComponent(tabId)}`,
      query: {
        offset: optionalStringParam(input, "offset"),
        limit: numberParam(input, "limit", input.pageSize ?? 20),
        lang
      }
    };
  }

  return {
    path: "/api/v1/browse",
    query: {
      sort: stringParam(input, "sort", "POPULAR"),
      genre: optionalStringParam(input, "genre"),
      country: optionalStringParam(input, "country"),
      limit: numberParam(input, "limit", input.pageSize ?? 30),
      lang
    }
  };
}

function viglooPlaybackPayload(payload: JsonRecord) {
  const body = asRecord(payload.payload);
  const rawUrl = stringRecordValue(body, "url");
  if (!rawUrl) return payload;

  const cookies = asRecord(body.cookies);
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => (typeof value === "string" && value ? `${key}=${value}` : null))
    .filter((item): item is string => Boolean(item))
    .join("; ");

  const { payload: _nested, ...rest } = payload;
  void _nested;

  if (!cookieHeader) return { ...rest, ...body };

  try {
    const url = new URL(rawUrl);
    url.searchParams.set("__cookie", cookieHeader);
    return { ...rest, ...body, url: url.toString() };
  } catch {
    return { ...rest, ...body };
  }
}

function providerSubtitleUrl(provider: ProviderCode, externalId: string, episodeNumber: number, lang: string) {
  const searchParams = new URLSearchParams({
    provider,
    externalId,
    episode: String(episodeNumber),
    lang
  });

  return `/api/provider-subtitle?${searchParams.toString()}`;
}

async function fetchViglooIndonesianSubtitle(masterUrl: string): Promise<PlaybackSubtitle | null> {
  const cookieHeader = new URL(masterUrl).searchParams.get("__cookie") ?? "";
  const fetchHeaders: Record<string, string> = {
    accept: "application/vnd.apple.mpegurl,*/*"
  };
  if (cookieHeader) fetchHeaders.Cookie = cookieHeader;

  const masterResponse = await fetch(masterUrl, {
    headers: fetchHeaders,
    signal: AbortSignal.timeout(15_000)
  });

  if (!masterResponse.ok) return null;
  const masterPlaylist = await masterResponse.text();

  let indonesianPlaylistUri: string | null = null;

  for (const line of masterPlaylist.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#EXT-X-MEDIA:")) continue;

    const attrs = parseExtXMediaAttributes(trimmed);
    if (attrs.TYPE?.toUpperCase() !== "SUBTITLES") continue;

    const language = (attrs.LANGUAGE ?? "").toLowerCase();
    const isIndonesian =
      language === "ind" ||
      language === "id" ||
      language === "id-id" ||
      language === "in" ||
      language === "in-id";

    if (!isIndonesian || !attrs.URI) continue;
    indonesianPlaylistUri = attrs.URI;
    break;
  }

  if (!indonesianPlaylistUri) return null;

  const subPlaylistUrl = new URL(indonesianPlaylistUri, masterUrl).toString();
  const subResponse = await fetch(subPlaylistUrl, {
    headers: fetchHeaders,
    signal: AbortSignal.timeout(15_000)
  });

  if (!subResponse.ok) return null;
  const subPlaylist = await subResponse.text();

  const segmentLine = subPlaylist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#"));

  if (!segmentLine) return null;

  const segmentUrl = new URL(segmentLine, subPlaylistUrl);

  if (cookieHeader && !segmentUrl.searchParams.has("__cookie")) {
    segmentUrl.searchParams.set("__cookie", cookieHeader);
  }

  return {
    lang: "id",
    label: "Indonesia",
    url: segmentUrl.toString(),
    format: "vtt"
  };
}

function parseExtXMediaAttributes(line: string): Record<string, string> {
  const body = line.slice("#EXT-X-MEDIA:".length);
  const attrs: Record<string, string> = {};
  const regex = /([A-Z0-9-]+)=("(?:[^"\\]|\\.)*"|[^,]*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const key = match[1];
    const value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      attrs[key] = value.slice(1, -1);
    } else {
      attrs[key] = value;
    }
  }
  return attrs;
}

export const providerConfigs: Record<ProviderCode, ProviderConfig> = {
  cashdrama: {
    code: "cashdrama",
    name: "CashDrama",
    baseUrl: "https://streamapi.web.id/p/cashdrama",
    defaultSection: "home",
    supportedSections: ["home", "search"],
    catalogSections: providerCatalogSections.cashdrama,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return {
          path: "/api/v1/search",
          query: { q: stringParam(input, "query", "cinta"), page: numberParam(input, "page", input.page), lang }
        };
      }
      return {
        path: "/api/v1/home",
        query: {
          lang,
          page: numberParam(input, "page", input.page),
          pageSize: numberParam(input, "pageSize", input.pageSize ?? 20),
          blockId: numberParam(input, "blockId", numberOr(input.section, 5))
        }
      };
    },
    drama: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`, query: { ep: 1, lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}/episodes`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/play/${encodeURIComponent(input.externalId)}/${input.episodeNumber}`,
      query: { lang }
    })
  },
  bilitv: {
    code: "bilitv",
    name: "BiliTV",
    baseUrl: "https://streamapi.web.id/p/bilitv",
    defaultSection: "home",
    supportedSections: ["home", "recommend", "dramas", "search"],
    catalogSections: providerCatalogSections.bilitv,
    catalog: (input, lang) => bilitvCatalog(input, lang),
    drama: (input, lang) => ({
      path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`,
      query: { lang }
    }),
    episodes: (input, lang) => ({
      path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`,
      query: { lang }
    }),
    playback: (input) => ({
      path: `/api/v1/drama/${encodeURIComponent(input.externalId)}/episode/${input.episodeNumber}`,
      query: { quality: input.quality ?? "720" }
    })
  },
  cubetv: {
    code: "cubetv",
    name: "CubeTV",
    baseUrl: "https://streamapi.web.id/p/cubetv",
    defaultSection: "shows",
    supportedSections: ["shows", "search"],
    catalogSections: providerCatalogSections.cubetv,
    catalog: (input, lang) => cubetvCatalog(input, lang),
    drama: (input, lang) => ({
      path: `/search/${encodeURIComponent(input.externalId)}/episodes`,
      query: { lang }
    }),
    episodes: (input) => ({ path: `/episode/${encodeURIComponent(input.externalId)}/list` }),
    playback: (input) => ({
      path: `/stream/${encodeURIComponent(input.externalId)}/${encodeURIComponent(input.episodeExternalId)}`
    })
  },
  dotdrama: {
    code: "dotdrama",
    name: "DotDrama",
    baseUrl: "https://streamapi.web.id/p/dotdrama",
    defaultSection: "dramas",
    supportedSections: ["dramas", "collections", "categories"],
    catalogSections: providerCatalogSections.dotdrama,
    catalog: (input, lang) => ({
      path: "/api/v1/dramas",
      query: { page: numberParam(input, "page", input.page), limit: numberParam(input, "limit", input.pageSize ?? 50), lang }
    }),
    drama: (input) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}` })
  },
  dramabite: {
    code: "dramabite",
    name: "DramaBite",
    baseUrl: "https://streamapi.web.id/p/dramabite",
    defaultSection: "dramas",
    supportedSections: ["dramas", "foryou", "recommend", "search"],
    catalogSections: providerCatalogSections.dramabite,
    catalog: (input, lang) => {
      if (input.section === "hot") return { path: "/api/v1/hot" };
      if (input.section === "search") {
        return {
          path: "/api/v1/search",
          query: { q: stringParam(input, "query", "cinta"), lang, limit: numberParam(input, "limit", input.pageSize ?? 20) }
        };
      }
      const route = ["foryou", "recommend"].includes(input.section) ? input.section : "dramas";
      return { path: `/api/v1/${route}`, query: { lang, page: numberParam(input, "page", Math.max(input.page - 1, 0)) } };
    },
    drama: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/drama/${encodeURIComponent(input.externalId)}/episode/${input.episodeNumber}`,
      query: { lang, quality: input.quality ?? "default" }
    })
  },
  dramadash: {
    code: "dramadash",
    name: "DramaDash",
    baseUrl: "https://streamapi.web.id/p/dramadash",
    defaultSection: "tabs",
    supportedSections: ["tabs", "15", "search"],
    catalogSections: providerCatalogSections.dramadash,
    catalog: (input) => {
      if (input.section === "search") {
        return { path: `/api/v1/search/${encodeURIComponent(stringParam(input, "query", "cinta"))}` };
      }
      return { path: `/api/v1/tabs/${numberParam(input, "tabId", numberOr(input.section, 15))}` };
    },
    drama: (input) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}` }),
    playback: (input) => ({ path: `/api/v1/episode/${encodeURIComponent(input.externalId)}/${input.episodeNumber}` })
  },
  dramanova: {
    code: "dramanova",
    name: "DramaNova",
    baseUrl: "https://streamapi.web.id/p/dramanova",
    defaultSection: "dramas",
    supportedSections: ["dramas", "recommend", "dramanova_hot", "search"],
    catalogSections: providerCatalogSections.dramanova,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { q: stringParam(input, "query", "cinta"), lang } };
      }
      if (input.section && !["dramas", "popular"].includes(input.section)) {
        const categoryKey = stringParam(input, "categoryKey", input.section === "recommend" ? "dramanova_hot" : input.section);
        const size = numberParam(input, "size", input.pageSize ?? 20);
        return {
          path: "/api/v1/recommend",
          query: {
            lang,
            categoryKey,
            page: numberParam(input, "page", input.page),
            size,
            limit: numberParam(input, "limit", size)
          }
        };
      }
      return { path: "/api/v1/dramas", query: { lang, page: numberParam(input, "page", input.page), size: numberParam(input, "size", input.pageSize ?? 20) } };
    },
    drama: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input) => ({
      path: "/api/video",
      query: { id: String(input.rawEpisode?.fileId ?? input.rawEpisode?.file_id ?? input.episodeExternalId) }
    })
  },
  dramarush: {
    code: "dramarush",
    name: "DramaRush",
    baseUrl: "https://streamapi.web.id/p/dramarush",
    defaultSection: "tabs",
    supportedSections: ["tabs", "0", "search"],
    catalogSections: providerCatalogSections.dramarush,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: `/api/v1/search/${encodeURIComponent(stringParam(input, "query", "cinta"))}`, query: { lang } };
      }
      if (input.section === "ranking") return { path: "/api/v1/ranking", query: { lang } };
      return { path: `/api/v1/tabs/${numberParam(input, "tabId", numberOr(input.section, 0))}`, query: { lang } };
    },
    drama: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({
      path: `/api/v1/play/${encodeURIComponent(input.externalId)}`,
      query: { page: 1, size: 200, lang }
    }),
    playback: (input, lang) => ({ path: `/api/v1/play/${encodeURIComponent(input.externalId)}/${input.episodeNumber}`, query: { lang } })
  },
  dramawave: {
    code: "dramawave",
    name: "DramaWave",
    baseUrl: "https://streamapi.web.id/p/dramawave",
    defaultSection: "popular",
    supportedSections: ["popular", "free", "female", "new", "male", "vip", "exclusive", "dubbing", "coming-soon", "recommend", "search"],
    catalogSections: providerCatalogSections.dramawave,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { q: stringParam(input, "query", "cinta"), lang } };
      }
      return {
        path: `/api/v1/feed/${encodeURIComponent(input.section || "popular")}`,
        query: { page: numberParam(input, "page", input.page), lang }
      };
    },
    drama: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/play/${input.episodeNumber}`, query: { lang } })
  },
  dramabox: {
    code: "dramabox",
    name: "DramaBox",
    baseUrl: "https://dramabox.nreel.id",
    defaultSection: "home",
    supportedSections: ["home", "new", "populer", "category-cina", "category-korea", "rank", "search"],
    catalogSections: providerCatalogSections.dramabox,
    catalog: (input, lang) => dramaboxCatalog(input, lang),
    drama: (input, lang) => ({ path: "/detail", query: { bookId: input.externalId, lang } }),
    episodes: (input, lang) => ({ path: "/detail", query: { bookId: input.externalId, lang } }),
    playback: (input, lang) => ({
      path: "/stream",
      query: {
        bookId: input.externalId,
        chapterIndex: Math.max(0, input.episodeNumber - 1),
        lang
      }
    })
  },
  flextv: {
    code: "flextv",
    name: "FlexTV",
    baseUrl: "https://streamapi.web.id/p/flextv",
    defaultSection: "popular",
    supportedSections: ["popular", "new", "chart", "female", "male", "anime", "search"],
    catalogSections: providerCatalogSections.flextv,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { q: stringParam(input, "query", "love"), page: numberParam(input, "page", input.page), lang } };
      }
      return { path: `/api/v1/tabs/${flexTab(input.section)}`, query: { page: numberParam(input, "page", input.page), lang } };
    },
    drama: (input, lang) => ({ path: `/api/v1/series/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/series/${encodeURIComponent(input.externalId)}/episodes`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/play/${encodeURIComponent(input.externalId)}/${encodeURIComponent(input.episodeExternalId)}`,
      query: { lang }
    })
  },
  flickreels: {
    code: "flickreels",
    name: "FlickReels",
    baseUrl: "https://streamapi.web.id/p/flickreels",
    defaultSection: "for-you",
    supportedSections: ["for-you", "hot-rank", "category", "search"],
    catalogSections: providerCatalogSections.flickreels,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { keyword: stringParam(input, "query", "cinta"), lang } };
      }
      if (input.section === "hot-rank") return { path: "/api/v1/hot-rank", query: { lang } };
      if (input.section === "category") {
        return {
          path: "/api/v1/category",
          query: {
            navigation_id: stringParam(input, "navigation_id", "88"),
            page: numberParam(input, "page", input.page),
            page_size: numberParam(input, "page_size", input.pageSize ?? 20),
            lang
          }
        };
      }
      return {
        path: flickreelsSection(input.section),
        query: { page: numberParam(input, "page", input.page), page_size: numberParam(input, "page_size", input.pageSize ?? 10), lang }
      };
    },
    drama: (input, lang) => ({ path: `/api/v1/chapters/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/chapters/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/stream/${encodeURIComponent(input.externalId)}/${encodeURIComponent(input.episodeExternalId)}`,
      query: { lang }
    })
  },
  freereels: {
    code: "freereels",
    name: "FreeReels",
    baseUrl: "https://streamapi.web.id/p/freereels",
    defaultSection: "popular",
    supportedSections: ["foryou", "popular", "new", "female", "male", "dubbing", "search"],
    catalogSections: providerCatalogSections.freereels,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { q: stringParam(input, "query", "love"), page: numberParam(input, "page", input.page), lang } };
      }
      const section = freereelsSection(input.section);
      if (section === "foryou") return { path: "/api/v1/foryou", query: { lang } };
      return {
        path: `/api/v1/${section}`,
        query: { page: numberParam(input, "page", input.page), lang }
      };
    },
    drama: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes`, query: { lang } }),
    playback: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/play/${input.episodeNumber}`, query: { lang } })
  },
  fundrama: {
    code: "fundrama",
    name: "FunDrama",
    baseUrl: "https://streamapi.web.id/p/fundrama",
    defaultSection: "dramas",
    supportedSections: ["dramas", "search"],
    catalogSections: providerCatalogSections.fundrama,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { q: stringParam(input, "query", "love"), lang: stringParam(input, "lang", "en") } };
      }
      return {
        path: "/api/v1/dramas",
        query: { lang, page: numberParam(input, "page", input.page), limit: numberParam(input, "limit", input.pageSize ?? 50) }
      };
    },
    drama: (input) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}` }),
    episodes: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}/episodes`, query: { lang } }),
    playback: (input) => ({
      path: `/api/v1/drama/${encodeURIComponent(input.externalId)}/episode/${input.episodeNumber}`,
      query: { quality: input.quality ?? "720P" }
    })
  },
  goodshort: {
    code: "goodshort",
    name: "GoodShort",
    baseUrl: "https://streamapi.web.id/p/goodshort",
    defaultSection: "home",
    supportedSections: ["home", "search"],
    catalogSections: providerCatalogSections.goodshort,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { q: stringParam(input, "query", "cinta") } };
      }
      return {
        path: "/api/v1/home",
        query: {
          channelId: goodshortChannel(lang),
          page: numberParam(input, "page", input.page),
          pageSize: numberParam(input, "pageSize", input.pageSize ?? 12)
        }
      };
    },
    drama: (input) => ({ path: `/api/v1/book/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/chapters/${encodeURIComponent(input.externalId)}` }),
    playback: (input) => ({
      path: `/api/v1/play/${encodeURIComponent(input.externalId)}/${encodeURIComponent(input.episodeExternalId)}`,
      query: { q: input.quality ?? "720p" }
    })
  },
  hishort: {
    code: "hishort",
    name: "HiShort",
    baseUrl: "https://streamapi.web.id/p/hishort",
    defaultSection: "home",
    supportedSections: ["home", "search"],
    catalogSections: providerCatalogSections.hishort,
    catalog: (input) => {
      if (input.section === "search") {
        return { path: `/api/v1/search/${encodeURIComponent(stringParam(input, "query", "cinta"))}` };
      }
      return { path: "/api/v1/home" };
    },
    drama: (input) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}` }),
    playback: (input) => ({ path: `/api/v1/episode/${encodeURIComponent(input.episodeExternalId)}` })
  },
  melolo: {
    code: "melolo",
    name: "Melolo",
    baseUrl: "https://streamapi.web.id/p/melolo",
    defaultSection: "bookmall",
    supportedSections: ["bookmall", "bookmall-tabs"],
    catalogSections: providerCatalogSections.melolo,
    catalog: (input, lang) => {
      if (input.section === "bookmall-tabs") {
        return { path: "/api/v1/bookmall/tabs", query: { gender: stringParam(input, "gender", "0"), lang } };
      }
      return { path: "/api/v1/bookmall", query: { lang } };
    },
    drama: (input, lang) => ({ path: "/api/v1/book", query: { id: input.externalId, lang } }),
    episodes: (input, lang) => ({ path: "/api/v1/series", query: { id: input.externalId, lang } }),
    playback: (input, lang) => ({
      path: "/api/v1/multi-video",
      query: { id: input.externalId, lang }
    })
  },
  meloshort: {
    code: "meloshort",
    name: "MeloShort",
    baseUrl: "https://streamapi.web.id/p/meloshort",
    defaultSection: "discover",
    supportedSections: ["dramas", "discover", "top"],
    catalogSections: providerCatalogSections.meloshort,
    catalog: (input, lang) => {
      if (input.section === "top") return { path: "/api/v1/dramas/top", query: { lang } };
      return {
        path: "/api/v1/dramas/discover",
        query: {
          page: numberParam(input, "page", input.page),
          limit: numberParam(input, "limit", input.pageSize ?? 20),
          lang
        }
      };
    },
    drama: (input, lang) => ({
      path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes`,
      query: { page: 1, limit: 1, lang }
    }),
    episodes: (input, lang) => ({
      path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes`,
      query: { page: 1, limit: 500, lang }
    }),
    playback: (input, lang) => ({
      path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes/${encodeURIComponent(input.episodeExternalId)}`,
      query: { lang }
    })
  },
  microdrama: {
    code: "microdrama",
    name: "MicroDrama",
    baseUrl: "https://streamapi.web.id/p/microdrama",
    defaultSection: "dramas",
    supportedSections: ["dramas"],
    catalogSections: providerCatalogSections.microdrama,
    catalog: (input, lang) => ({
      path: "/api/v1/dramas",
      query: { lang, limit: numberParam(input, "limit", input.pageSize ?? 50) }
    }),
    drama: (input) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}` })
  },
  minutedrama: {
    code: "minutedrama",
    name: "MinuteDrama",
    baseUrl: "https://streamapi.web.id/p/minutedrama",
    defaultSection: "popular",
    supportedSections: ["popular"],
    catalogSections: providerCatalogSections.minutedrama,
    catalog: (input) => ({
      path: "/api/v1/popular",
      query: { page: numberParam(input, "page", input.page), size: numberParam(input, "size", input.pageSize ?? 20) }
    }),
    drama: (input) => ({ path: `/api/v1/videos/${encodeURIComponent(input.externalId)}`, query: { source: numberInputParam(input, "source", 1001) } }),
    episodes: (input) => ({ path: `/api/v1/videos/${encodeURIComponent(input.externalId)}`, query: { source: numberInputParam(input, "source", 1001) } })
  },
  moboreels: {
    code: "moboreels",
    name: "MoboReels",
    baseUrl: "https://streamapi.web.id/p/moboreels",
    defaultSection: "trending",
    supportedSections: ["trending", "latest", "channel-detail"],
    catalogSections: providerCatalogSections.moboreels,
    catalog: (input, lang) => moboreelsCatalog(input, lang),
    drama: (input, lang) => ({
      path: "/api/seriesDetail",
      query: { seriesId: input.externalId, langId: numericLangId(lang) }
    }),
    episodes: (input, lang) => ({
      path: "/api/seriesPage",
      query: {
        seriesId: input.externalId,
        pageNo: 1,
        pageSize: 500,
        langId: numericLangId(lang)
      }
    }),
    playback: (input, lang) => ({
      path: "/api/video",
      query: {
        seriesId: input.externalId,
        episNum: input.episodeNumber,
        langId: numericLangId(lang)
      }
    })
  },
  netshort: {
    code: "netshort",
    name: "NetShort",
    baseUrl: "https://streamapi.web.id/p/netshort",
    defaultSection: "feed",
    supportedSections: ["feed", "explore", "new", "dubbing", "vip", "category", "search", "tab:*"],
    catalogSections: providerCatalogSections.netshort,
    catalog: (input, lang) => netshortCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/v1/detail/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/detail/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/episode/${encodeURIComponent(input.externalId)}/${input.episodeNumber}`,
      query: { lang }
    })
  },
  rapidtv: {
    code: "rapidtv",
    name: "RapidTV",
    baseUrl: "https://streamapi.web.id/p/rapidtv",
    defaultSection: "dramas",
    supportedSections: ["dramas"],
    catalogSections: providerCatalogSections.rapidtv,
    catalog: (input, lang) => ({
      path: "/api/v1/dramas",
      query: { page: numberParam(input, "page", input.page), size: numberParam(input, "size", input.pageSize ?? 20), lang }
    }),
    drama: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes`, query: { lang } })
  },
  radreels: {
    code: "radreels",
    name: "RadReels",
    baseUrl: "https://streamapi.web.id/p/radreels",
    defaultSection: "ranking",
    supportedSections: ["ranking", "home", "foryou", "tab"],
    catalogSections: providerCatalogSections.radreels,
    catalog: (input, lang) => radreelsCatalog(input, lang),
    drama: (input, lang) => ({
      path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`,
      query: { page: 1, lang }
    }),
    episodes: (input, lang) => ({
      path: `/api/v1/episodes/${encodeURIComponent(input.externalId)}`,
      query: { lang }
    }),
    playback: (input, lang) => ({
      path: `/api/v1/video/${encodeURIComponent(String(input.rawEpisode?.videoFakeId ?? input.episodeExternalId))}/${encodeURIComponent(String(input.rawEpisode?.id ?? input.episodeNumber))}`,
      query: { lang }
    })
  },
  reelala: {
    code: "reelala",
    name: "Reelala",
    baseUrl: "https://streamapi.web.id/p/reelala",
    defaultSection: "home",
    supportedSections: ["home", "for-you"],
    catalogSections: providerCatalogSections.reelala,
    catalog: (input, lang) => ({
      path: input.section === "for-you" ? "/api/for-you" : "/api/home",
      query: { lang }
    }),
    drama: (input, lang) => ({ path: "/api/chapters", query: { playlet_id: input.externalId, lang } }),
    episodes: (input, lang) => ({ path: "/api/chapters", query: { playlet_id: input.externalId, lang } })
  },
  reelife: {
    code: "reelife",
    name: "Reelife",
    baseUrl: "https://streamapi.web.id/p/reelife",
    defaultSection: "dramas",
    supportedSections: ["dramas", "foryou", "ranking", "search"],
    catalogSections: providerCatalogSections.reelife,
    catalog: (input) => {
      if (input.section === "foryou") {
        return { path: "/api/v1/foryou", query: { page: numberParam(input, "page", input.page), size: numberParam(input, "size", input.pageSize ?? 20) } };
      }
      if (input.section === "ranking") {
        return { path: "/api/v1/ranking", query: { rankId: stringParam(input, "rankId", "1") } };
      }
      if (input.section === "search") {
        return {
          path: "/api/v1/search",
          query: {
            q: stringParam(input, "query", "cinta"),
            page: numberParam(input, "page", input.page),
            size: numberParam(input, "size", input.pageSize ?? 20)
          }
        };
      }
      return {
        path: "/api/v1/dramas",
        query: {
          tab: optionalStringParam(input, "tab"),
          page: numberParam(input, "page", input.page),
          size: numberParam(input, "size", input.pageSize ?? 20)
        }
      };
    },
    drama: (input) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/chapters` }),
    playback: (input) => ({
      path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes/${encodeURIComponent(input.episodeExternalId)}`
    })
  },
  reelshort: {
    code: "reelshort",
    name: "ReelShort",
    baseUrl: "https://streamapi.web.id/p/reelshort",
    defaultSection: "foryou",
    supportedSections: ["foryou", "new", "completed", "romance", "drama", "search"],
    catalogSections: providerCatalogSections.reelshort,
    catalog: (input, lang) => {
      if (input.section === "search") {
        return { path: "/api/v1/search", query: { q: stringParam(input, "query", "love"), page: numberParam(input, "page", input.page), lang } };
      }
      const route = ["foryou", "new", "completed", "romance", "drama"].includes(input.section)
        ? input.section
        : "foryou";
      return { path: `/api/v1/${route}`, query: { lang } };
    },
    drama: (input, lang) => ({
      path: `/api/v1/book/${encodeURIComponent(input.externalId)}`,
      query: { lang }
    }),
    episodes: (input, lang) => ({
      path: `/api/v1/book/${encodeURIComponent(input.externalId)}/chapters`,
      query: { lang }
    }),
    playback: (input) => ({
      path: `/api/v1/book/${encodeURIComponent(input.externalId)}/chapter/${encodeURIComponent(input.episodeExternalId)}/video`
    })
  },
  sarostv: {
    code: "sarostv",
    name: "SarosTV",
    baseUrl: "https://streamapi.web.id/p/sarostv",
    defaultSection: "recommend",
    supportedSections: ["recommend", "theater", "search"],
    catalogSections: providerCatalogSections.sarostv,
    catalog: (input, lang) => sarostvCatalog(input, lang),
    drama: (input, lang) => ({
      path: "/api/series",
      query: { id: input.externalId, lang }
    }),
    episodes: (input, lang) => ({
      path: "/api/series",
      query: { id: input.externalId, lang }
    }),
    playback: (input, lang) => ({
      path: "/api/series/episode",
      query: { id: input.externalId, ep: input.episodeNumber, lang }
    })
  },
  shortbox: {
    code: "shortbox",
    name: "ShortBox",
    baseUrl: "https://streamapi.web.id/p/shortbox",
    defaultSection: "list",
    supportedSections: ["list", "new-list", "search"],
    catalogSections: providerCatalogSections.shortbox,
    catalog: (input, lang) => shortboxCatalog(input, lang),
    drama: (input, lang) => ({
      path: `/api/detail/${encodeURIComponent(input.externalId)}`,
      query: { languages: lang }
    }),
    episodes: (input, lang) => ({
      path: `/api/episodes/${encodeURIComponent(input.externalId)}`,
      query: { index: 1, count: 500, languages: lang }
    }),
    playback: (input, lang) => ({
      path: `/api/stream/${encodeURIComponent(input.externalId)}/${input.episodeNumber}`,
      query: {
        quality: input.quality?.replace(/p$/i, "") ?? "720",
        languages: lang
      }
    })
  },
  shorten: {
    code: "shorten",
    name: "Shorten",
    baseUrl: "https://streamapi.web.id/p/shorten",
    defaultSection: "editors",
    supportedSections: ["editors", "exclusive", "dubbed", "releases", "explore"],
    catalogSections: providerCatalogSections.shorten,
    catalog: (input) => shortenCatalog(input),
    drama: (input) => ({ path: `/api/v1/series/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/series/${encodeURIComponent(input.externalId)}` }),
    playback: (input) => ({ path: `/api/v1/series/${encodeURIComponent(input.externalId)}` })
  },
  shortmax: {
    code: "shortmax",
    name: "ShortMax",
    baseUrl: "https://streamapi.web.id/p/shortmax",
    defaultSection: "recommend",
    supportedSections: ["home", "recommend", "vip", "new", "ranked", "war", "epic", "romance", "foryou", "search"],
    catalogSections: providerCatalogSections.shortmax,
    catalog: (input, lang) => shortmaxCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/v1/detail/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/detail/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/play/${encodeURIComponent(input.externalId)}`,
      query: { ep: input.episodeNumber, lang }
    })
  },
  shortsky: {
    code: "shortsky",
    name: "ShortSky",
    baseUrl: "https://streamapi.web.id/p/shortsky",
    defaultSection: "home",
    supportedSections: ["home", "recommend", "search"],
    catalogSections: providerCatalogSections.shortsky,
    catalog: (input, lang) => shortskyCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/drama/${encodeURIComponent(input.externalId)}/episode/${input.episodeNumber}`,
      query: { lang }
    })
  },
  shortwave: {
    code: "shortwave",
    name: "ShortWave",
    baseUrl: "https://streamapi.web.id/p/shortwave",
    defaultSection: "top",
    supportedSections: ["top", "all", "more", "rankings", "search"],
    catalogSections: providerCatalogSections.shortwave,
    catalog: (input, lang) => shortwaveCatalog(input, lang),
    drama: (input) => ({ path: `/api/drama/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/drama/${encodeURIComponent(input.externalId)}` }),
    playback: (input) => ({
      path: `/api/stream/${encodeURIComponent(input.externalId)}/${encodeURIComponent(input.episodeExternalId)}`
    })
  },
  shotshort: {
    code: "shotshort",
    name: "ShotShort",
    baseUrl: "https://streamapi.web.id/p/shotshort",
    defaultSection: "popular",
    supportedSections: ["popular", "category", "search"],
    catalogSections: providerCatalogSections.shotshort,
    catalog: (input, lang) => shotshortCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/book/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/book/${encodeURIComponent(input.externalId)}/episodes`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/book/${encodeURIComponent(input.externalId)}/chapter/${encodeURIComponent(input.episodeExternalId)}`,
      query: { lang }
    })
  },
  snackshort: {
    code: "snackshort",
    name: "SnackShort",
    baseUrl: "https://streamapi.web.id/p/snackshort",
    defaultSection: "home",
    supportedSections: ["home", "browsing", "search"],
    catalogSections: providerCatalogSections.snackshort,
    catalog: (input, lang) => snackshortCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/v1/book/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/book/${encodeURIComponent(input.externalId)}/chapters`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/book/${encodeURIComponent(input.externalId)}/episode/${encodeURIComponent(input.episodeExternalId)}`,
      query: { lang }
    })
  },
  sodareels: {
    code: "sodareels",
    name: "SodaReels",
    baseUrl: "https://streamapi.web.id/p/sodareels",
    defaultSection: "home",
    supportedSections: ["home", "category", "search"],
    catalogSections: providerCatalogSections.sodareels,
    catalog: (input, lang) => sodareelsCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/v1/info/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/info/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    playback: (input) => ({
      path: "/api/v1/episodes",
      query: { ids: input.episodeExternalId }
    })
  },
  stardusttv: {
    code: "stardusttv",
    name: "StardustTV",
    baseUrl: "https://streamapi.web.id/p/stardusttv",
    defaultSection: "homepage",
    supportedSections: ["homepage", "category", "search"],
    catalogSections: providerCatalogSections.stardusttv,
    catalog: (input, lang) => stardusttvCatalog(input, lang),
    drama: (input) => ({ path: `/api/v1/video/${encodeURIComponent(input.externalId)}` }),
    episodes: (input) => ({ path: `/api/v1/video/${encodeURIComponent(input.externalId)}` }),
    playback: (input) => ({
      path: `/api/v1/video/${encodeURIComponent(input.externalId)}/episode/${input.episodeNumber}`
    })
  },
  starshort: {
    code: "starshort",
    name: "StarShort",
    baseUrl: "https://streamapi.web.id/p/starshort",
    defaultSection: "dramas",
    supportedSections: ["dramas", "new", "search"],
    catalogSections: providerCatalogSections.starshort,
    catalog: (input, lang) => starshortCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes`, query: { lang } }),
    playback: (input, lang) => ({
      path: `/api/v1/dramas/${encodeURIComponent(input.externalId)}/episodes/${input.episodeNumber}`,
      query: { lang }
    })
  },
  velolo: {
    code: "velolo",
    name: "Velolo",
    baseUrl: "https://streamapi.web.id/p/velolo",
    defaultSection: "hot",
    supportedSections: ["hot", "new", "search"],
    catalogSections: providerCatalogSections.velolo,
    catalog: (input, lang) => veloloCatalog(input, lang),
    drama: (input, lang) => ({ path: `/detail/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input, lang) => ({ path: `/detail/${encodeURIComponent(input.externalId)}`, query: { lang } })
  },
  vigloo: {
    code: "vigloo",
    name: "Vigloo",
    baseUrl: "https://streamapi.web.id/p/vigloo",
    defaultSection: "browse",
    supportedSections: ["browse", "tab", "rank", "search"],
    catalogSections: providerCatalogSections.vigloo,
    catalog: (input, lang) => viglooCatalog(input, lang),
    drama: (input, lang) => ({ path: `/api/v1/drama/${encodeURIComponent(input.externalId)}`, query: { lang } }),
    episodes: (input) => ({
      path: `/api/v1/drama/${encodeURIComponent(input.externalId)}/season/${numberInputParam(input, "seasonId", numberOr(input.externalId, 0))}/episodes`
    }),
    playback: (input) => ({
      path: "/api/v1/play",
      query: {
        seasonId: String(input.rawEpisode?.seasonId ?? input.externalId),
        ep: String(input.rawEpisode?.episodeNumber ?? Math.max(0, input.episodeNumber - 1))
      }
    })
  }
};

export class ConfiguredProviderAdapter implements ProviderAdapter {
  readonly code: ProviderCode;
  readonly name: string;
  readonly baseUrl: string;
  readonly defaultSection: string;
  readonly supportedSections: string[];
  readonly catalogSections: CatalogSectionDefinition[];

  constructor(private readonly config: ProviderConfig) {
    this.code = config.code;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.defaultSection = config.defaultSection;
    this.supportedSections = config.supportedSections;
    this.catalogSections = config.catalogSections;
  }

  mapLang(lang: string) {
    return normalizeLangForProvider(this.code, lang);
  }

  async listCatalog(input: CatalogInput): Promise<ProviderCatalogResult> {
    const endpoint = this.config.catalog(input, this.mapLang(input.lang));
    const payload = await this.fetch(endpoint);
    const seen = new Set<string>();
    const items = extractListPayload(payload)
      .filter((item) => !shouldSkipCatalogItem(this.code, item))
      .map((item) => normalizeDrama(item, this.code, input.lang))
      .filter(isValidDrama)
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

    return {
      provider: this.code,
      section: input.section,
      page: input.page,
      lang: input.lang,
      items,
      rawPayload: asRecord(payload)
    };
  }

  async getDrama(input: DramaInput) {
    const endpoint = this.config.drama(input, this.mapLang(input.lang));
    const payload = await this.fetch(endpoint);
    if (isEmptyProviderPayload(payload)) {
      throw new ProviderEmptyDramaPayloadError(this.code, input.externalId);
    }
    const drama = normalizeDrama(payload, this.code, input.lang, input.externalId);
    if (!isValidDrama(drama)) {
      throw new Error(`Provider ${this.code} returned invalid drama payload for ${input.externalId}`);
    }
    return drama;
  }

  async getEpisodes(input: EpisodesInput) {
    const endpoint = this.config.episodes(input, this.mapLang(input.lang));
    const payload = await this.fetch(endpoint);
    const episodes = extractEpisodesPayload(payload).filter((item) => {
      if (this.code !== "shorten") return true;
      return String(asRecord(item).type ?? "").toLowerCase() !== "teaser";
    });
    return episodes.map((item, index) =>
      normalizeEpisode(item, this.code, input.lang, input.externalId, index)
    );
  }

  async resolvePlayback(input: PlaybackInput) {
    if (this.code === "goodshort") {
      const directPlayback = goodshortPlaybackFromRawEpisode(input);
      if (directPlayback) {
        return directPlayback;
      }
      if (process.env.ALLOW_PROVIDER_UNLOCK === "true") {
        await this.fetch({ path: `/api/v1/unlock/${encodeURIComponent(input.externalId)}`, query: { q: input.quality ?? "720p" } });
      }
    }

    const endpoint = this.config.playback?.(input, this.mapLang(input.lang));
    if (!endpoint) {
      return normalizePlayback(input.rawEpisode ?? {}, this.code, input.episodeId, input.rawEpisode);
    }

    const payload = await this.fetch(endpoint);
    const playbackPayload =
      this.code === "melolo"
        ? selectMeloloPlaybackPayload(payload, input)
        : this.code === "shorten"
          ? selectShortenPlaybackPayload(payload, input)
        : this.code === "vigloo"
          ? viglooPlaybackPayload(payload)
          : payload;
    const playback = normalizePlayback(playbackPayload, this.code, input.episodeId, input.rawEpisode);

    if (this.code === "moboreels") {
      const langId = this.mapLang(input.lang);
      const subtitle = await this.fetchText({
        path: "/api/proxy/subtitle",
        query: {
          episId: input.episodeExternalId,
          langId
        }
      }).catch(() => "");

      if (!normalizeSubtitleToVtt(subtitle)) {
        return playback;
      }

      return {
        ...playback,
        subtitles: [
          ...playback.subtitles,
          {
            lang: "id",
            label: "Indonesia",
            url: providerSubtitleUrl(this.code, input.episodeExternalId, input.episodeNumber, "id"),
            format: "vtt" as const
          }
        ]
      };
    }

    if (this.code === "vigloo") {
      const masterUrl = playback.sources[0]?.url;
      if (!masterUrl) return playback;

      const indonesianSubtitle = await fetchViglooIndonesianSubtitle(masterUrl).catch(() => null);

      if (!indonesianSubtitle) return playback;

      return {
        ...playback,
        subtitles: [
          ...playback.subtitles,
          indonesianSubtitle
        ]
      };
    }

    if (this.code !== "bilitv") {
      return playback;
    }

    const lang = this.mapLang(input.lang);
    const subtitlePayload = await this.fetch({
      path: `/api/v1/subtitle/${encodeURIComponent(input.externalId)}/${input.episodeNumber}`,
      query: {
        lang,
        format: "json"
      }
    }).catch(() => null);
    const subtitleVtt = subtitlePayload ? asRecord(subtitlePayload).vtt : null;

    if (typeof subtitleVtt !== "string" || !subtitleVtt.includes("WEBVTT")) {
      return playback;
    }

    return {
      ...playback,
      subtitles: [
        ...playback.subtitles,
        {
          lang,
          label: lang === "id" ? "Indonesia" : lang,
          url: providerSubtitleUrl(this.code, input.externalId, input.episodeNumber, lang),
          format: "vtt" as const
        }
      ]
    };
  }

  private fetch(endpoint: ProviderEndpoint) {
    return fetchProviderJson<JsonRecord>({
      provider: this.code,
      baseUrl: this.baseUrl,
      path: endpoint.path,
      query: endpoint.query
    });
  }

  private fetchText(endpoint: ProviderEndpoint) {
    return fetchProviderText({
      provider: this.code,
      baseUrl: this.baseUrl,
      path: endpoint.path,
      query: endpoint.query
    });
  }
}
