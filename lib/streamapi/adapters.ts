import { fetchProviderJson } from "@/lib/streamapi/http";
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
  CatalogInput,
  CatalogSectionDefinition,
  DramaInput,
  EpisodesInput,
  JsonRecord,
  PlaybackInput,
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
    const drama = normalizeDrama(payload, this.code, input.lang, input.externalId);
    if (!isValidDrama(drama)) {
      if (isEmptyProviderPayload(payload)) {
        throw new ProviderEmptyDramaPayloadError(this.code, input.externalId);
      }
      throw new Error(`Provider ${this.code} returned invalid drama payload for ${input.externalId}`);
    }
    return drama;
  }

  async getEpisodes(input: EpisodesInput) {
    const endpoint = this.config.episodes(input, this.mapLang(input.lang));
    const payload = await this.fetch(endpoint);
    return extractEpisodesPayload(payload).map((item, index) =>
      normalizeEpisode(item, this.code, input.lang, input.externalId, index)
    );
  }

  async resolvePlayback(input: PlaybackInput) {
    if (this.code === "goodshort" && process.env.ALLOW_PROVIDER_UNLOCK === "true") {
      await this.fetch({ path: `/api/v1/unlock/${encodeURIComponent(input.externalId)}`, query: { q: input.quality ?? "720p" } });
    }

    const endpoint = this.config.playback?.(input, this.mapLang(input.lang));
    if (!endpoint) {
      return normalizePlayback(input.rawEpisode ?? {}, this.code, input.episodeId, input.rawEpisode);
    }

    const payload = await this.fetch(endpoint);
    const playbackPayload = this.code === "melolo" ? selectMeloloPlaybackPayload(payload, input) : payload;
    return normalizePlayback(playbackPayload, this.code, input.episodeId, input.rawEpisode);
  }

  private fetch(endpoint: ProviderEndpoint) {
    return fetchProviderJson<JsonRecord>({
      provider: this.code,
      baseUrl: this.baseUrl,
      path: endpoint.path,
      query: endpoint.query
    });
  }
}
