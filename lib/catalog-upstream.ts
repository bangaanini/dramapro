export const CATALOG_PLATFORM_IDS = [] as const;
export type CatalogPlatformId = string;

export const CATALOG_PLATFORM_LABELS: Record<string, string> = {};
export const DEFAULT_CATALOG_PLATFORM = "streamapi";
export const DEFAULT_CATALOG_LANGUAGE = "id";

export type UpstreamLanguagePayload = {
  supported: string[];
  mapping: Record<string, string>;
};

export type UpstreamTabItem = {
  type: string;
  name: string;
  tab_key: string;
  position_index: number;
};

export type UpstreamPageInfo = {
  has_more: boolean | string | number | null;
  pageNo?: number | null;
  pageSize?: number | null;
  tabKey?: string | number | null;
  positionIndex?: number | null;
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

function ignoreLegacyArgs(args: unknown[]) {
  void args;
}

function legacyCatalogDisabled(): never {
  throw new CatalogUpstreamError(
    "Legacy catalog upstream is disabled. Use StreamAPI provider sync instead.",
    410,
    null,
  );
}

export async function fetchPlatformLanguages(
  ...args: unknown[]
): Promise<UpstreamLanguagePayload> {
  ignoreLegacyArgs(args);
  legacyCatalogDisabled();
}

export async function fetchPlatformTablist(
  ...args: unknown[]
): Promise<UpstreamTabItem[]> {
  ignoreLegacyArgs(args);
  legacyCatalogDisabled();
}

export async function fetchPlatformTabdata(...args: unknown[]): Promise<{
  entries: UpstreamSeriesSummary[];
  pageInfo: UpstreamPageInfo;
}> {
  ignoreLegacyArgs(args);
  legacyCatalogDisabled();
}

export async function fetchPlatformTabfeed(...args: unknown[]): Promise<{
  entries: UpstreamSeriesSummary[];
  pageInfo: UpstreamPageInfo;
}> {
  ignoreLegacyArgs(args);
  legacyCatalogDisabled();
}

export async function fetchPlatformSearch(...args: unknown[]): Promise<{
  entries: UpstreamSeriesSummary[];
  pageInfo: UpstreamPageInfo;
}> {
  ignoreLegacyArgs(args);
  legacyCatalogDisabled();
}

export async function fetchPlatformSeriesDetail(
  ...args: unknown[]
): Promise<UpstreamSeriesDetail> {
  ignoreLegacyArgs(args);
  legacyCatalogDisabled();
}
