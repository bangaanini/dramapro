export const PROVIDERS = [
  "cashdrama",
  "dotdrama",
  "dramabite",
  "dramadash",
  "dramanova",
  "dramarush",
  "dramawave",
  "flextv",
  "flickreels",
  "freereels",
  "fundrama",
  "goodshort",
  "hishort",
  "melolo",
  "meloshort",
  "microdrama",
  "minutedrama",
  "netshort",
  "rapidtv",
  "reelala",
  "reelife"
] as const;

export type ProviderCode = (typeof PROVIDERS)[number];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, JsonValue>;

export type SourceType = "hls" | "mp4";

export type PlaybackStatus = "ready" | "locked" | "unavailable";

export type CatalogParamType = "fixed" | "number" | "text" | "select";

export interface CatalogParamOption {
  value: string;
  label: string;
}

export interface CatalogParamDefinition {
  name: string;
  label: string;
  type: CatalogParamType;
  required?: boolean;
  defaultValue?: string | number;
  help: string;
  min?: number;
  max?: number;
  options?: CatalogParamOption[];
}

export interface CatalogSectionDefinition {
  value: string;
  label: string;
  description: string;
  pathLabel: string;
  supportsPage: boolean;
  defaultPage: number;
  params: CatalogParamDefinition[];
}

export interface CanonicalDrama {
  id: string;
  provider: ProviderCode;
  externalId: string;
  lang: string;
  title: string;
  description: string | null;
  posterUrl: string | null;
  tags: string[];
  episodeCount: number | null;
  status: "ongoing" | "completed" | "unknown";
  rawPayload: JsonRecord;
}

export interface CanonicalEpisode {
  id: string;
  dramaId: string;
  provider: ProviderCode;
  dramaExternalId: string;
  externalId: string;
  episodeNumber: number;
  title: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  isLocked: boolean;
  rawPayload: JsonRecord;
}

export interface PlaybackSource {
  url: string;
  quality: string;
  mimeType: string;
  codec: string | null;
  expiresAt: string | null;
}

export interface PlaybackSubtitle {
  lang: string;
  label: string;
  url: string;
  format: "srt" | "vtt" | "unknown";
}

export interface CanonicalPlayback {
  episodeId: string;
  provider: ProviderCode;
  status: PlaybackStatus;
  sourceType: SourceType | null;
  sources: PlaybackSource[];
  subtitles: PlaybackSubtitle[];
  duration: number | null;
  expiresAt: string | null;
  providerMeta: JsonRecord;
}

export interface CatalogInput {
  provider: ProviderCode;
  section: string;
  page: number;
  lang: string;
  pageSize?: number;
  params?: JsonRecord;
}

export interface DramaInput {
  provider: ProviderCode;
  externalId: string;
  lang: string;
}

export type EpisodesInput = DramaInput;

export interface PlaybackInput extends DramaInput {
  episodeId: string;
  episodeExternalId: string;
  episodeNumber: number;
  quality?: string;
  rawEpisode?: JsonRecord;
}

export interface ProviderCatalogResult {
  provider: ProviderCode;
  section: string;
  page: number;
  lang: string;
  items: CanonicalDrama[];
  rawPayload: JsonRecord;
}

export interface ProviderAdapter {
  code: ProviderCode;
  name: string;
  baseUrl: string;
  defaultSection: string;
  supportedSections: string[];
  catalogSections: CatalogSectionDefinition[];
  mapLang(lang: string): string;
  listCatalog(input: CatalogInput): Promise<ProviderCatalogResult>;
  getDrama(input: DramaInput): Promise<CanonicalDrama>;
  getEpisodes(input: EpisodesInput): Promise<CanonicalEpisode[]>;
  resolvePlayback(input: PlaybackInput): Promise<CanonicalPlayback>;
}
