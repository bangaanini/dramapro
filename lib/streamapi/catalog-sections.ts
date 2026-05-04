import type { CatalogParamDefinition, CatalogSectionDefinition, JsonRecord, JsonValue, ProviderCode } from "@/lib/streamapi/types";

const pageParam = (defaultValue: number, min = 1): CatalogParamDefinition => ({
  name: "page",
  label: "Page",
  type: "number",
  required: true,
  defaultValue,
  min,
  help: "Halaman upstream yang ingin diambil."
});

const pageSizeParam = (name: "limit" | "pageSize" | "size" | "page_size", defaultValue: number): CatalogParamDefinition => ({
  name,
  label: name,
  type: "number",
  required: true,
  defaultValue,
  min: 1,
  max: 1000,
  help: "Jumlah item yang diminta dalam satu request."
});

const fixedParam = (name: string, value: string | number, help: string): CatalogParamDefinition => ({
  name,
  label: name,
  type: "fixed",
  defaultValue: value,
  help
});

const textParam = (name: string, label: string, defaultValue: string, help: string): CatalogParamDefinition => ({
  name,
  label,
  type: "text",
  required: true,
  defaultValue,
  help
});

const numberParam = (name: string, label: string, defaultValue: number, help: string, min = 0): CatalogParamDefinition => ({
  name,
  label,
  type: "number",
  required: true,
  defaultValue,
  min,
  help
});

const selectParam = (
  name: string,
  label: string,
  defaultValue: string,
  help: string,
  options: { value: string; label: string }[]
): CatalogParamDefinition => ({
  name,
  label,
  type: "select",
  required: true,
  defaultValue,
  help,
  options
});

const endpoint = (input: CatalogSectionDefinition) => input;

export const providerCatalogSections: Record<ProviderCode, CatalogSectionDefinition[]> = {
  cashdrama: [
    endpoint({
      value: "home",
      label: "Home Feed",
      description: "Mengambil daftar drama dari feed home CashDrama.",
      pathLabel: "GET /api/v1/home",
      supportsPage: true,
      defaultPage: 1,
      params: [
        fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."),
        pageParam(1),
        pageSizeParam("pageSize", 20),
        numberParam("blockId", "Block ID", 5, "ID blok kategori dari endpoint helper /api/v1/blocks.", 1)
      ]
    })
  ],
  dotdrama: [
    endpoint({
      value: "dramas",
      label: "Drama List",
      description: "Mengambil daftar drama utama DotDrama.",
      pathLabel: "GET /api/v1/dramas",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("limit", 50)]
    })
  ],
  dramabite: [
    endpoint({
      value: "dramas",
      label: "Drama List",
      description: "Mengambil daftar drama utama DramaBite.",
      pathLabel: "GET /api/v1/dramas",
      supportsPage: true,
      defaultPage: 0,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(0, 0)]
    }),
    endpoint({
      value: "foryou",
      label: "For You",
      description: "Mengambil rekomendasi For You DramaBite.",
      pathLabel: "GET /api/v1/foryou",
      supportsPage: true,
      defaultPage: 0,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(0, 0)]
    }),
    endpoint({
      value: "recommend",
      label: "Homepage Recommend",
      description: "Mengambil rekomendasi homepage DramaBite.",
      pathLabel: "GET /api/v1/recommend",
      supportsPage: true,
      defaultPage: 0,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(0, 0)]
    })
  ],
  dramadash: [
    endpoint({
      value: "tabs",
      label: "Tab Drama",
      description: "Mengambil drama berdasarkan tab Dramadash.",
      pathLabel: "GET /api/v1/tabs/:id",
      supportsPage: false,
      defaultPage: 1,
      params: [numberParam("tabId", "Tab ID", 15, "ID tab dari dokumentasi Dramadash.", 1)]
    })
  ],
  dramanova: [
    endpoint({
      value: "dramas",
      label: "Drama List",
      description: "Mengambil daftar drama utama DramaNova.",
      pathLabel: "GET /api/v1/dramas",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("size", 20)]
    }),
    endpoint({
      value: "recommend",
      label: "Recommend by Category",
      description: "Mengambil rekomendasi DramaNova berdasarkan categoryKey.",
      pathLabel: "GET /api/v1/recommend",
      supportsPage: true,
      defaultPage: 1,
      params: [
        fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."),
        textParam("categoryKey", "Category Key", "dramanova_hot", "Key kategori dari endpoint helper /api/v1/modules."),
        pageParam(1),
        pageSizeParam("size", 5),
        pageSizeParam("limit", 6)
      ]
    })
  ],
  dramarush: [
    endpoint({
      value: "tabs",
      label: "Tab Home",
      description: "Mengambil data home berdasarkan tab DramaRush.",
      pathLabel: "GET /api/v1/tabs/:id",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), numberParam("tabId", "Tab ID", 0, "ID tab home DramaRush.", 0)]
    })
  ],
  dramawave: [
    ...["popular", "free", "female", "new", "male", "vip", "exclusive", "dubbing", "coming-soon", "recommend"].map((tab) =>
      endpoint({
        value: tab,
        label: tab,
        description: `Mengambil feed DramaWave tab ${tab}.`,
        pathLabel: `GET /api/v1/feed/${tab}`,
        supportsPage: true,
        defaultPage: 1,
        params: [fixedParam("lang", "id-ID", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
      })
    )
  ],
  dramabox: [
    endpoint({
      value: "home",
      label: "Home",
      description: "Mengambil feed home DramaBox.",
      pathLabel: "GET /?home",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
    }),
    endpoint({
      value: "new",
      label: "New",
      description: "Mengambil drama terbaru DramaBox.",
      pathLabel: "GET /?new",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
    }),
    endpoint({
      value: "populer",
      label: "Populer",
      description: "Mengambil drama populer DramaBox.",
      pathLabel: "GET /?populer",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
    }),
    endpoint({
      value: "category-cina",
      label: "Category Cina",
      description: "Mengambil kategori Cina DramaBox.",
      pathLabel: "GET /?category=cina",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
    }),
    endpoint({
      value: "category-korea",
      label: "Category Korea",
      description: "Mengambil kategori Korea DramaBox.",
      pathLabel: "GET /?category=korea",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
    }),
    endpoint({
      value: "rank",
      label: "Rank",
      description: "Mengambil ranking DramaBox.",
      pathLabel: "GET /?rank",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "search",
      label: "Search",
      description: "Mengambil hasil pencarian DramaBox.",
      pathLabel: "GET /?search=:query",
      supportsPage: true,
      defaultPage: 1,
      params: [
        fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."),
        textParam("query", "Keyword", "cinta", "Kata kunci pencarian DramaBox."),
        pageParam(1)
      ]
    })
  ],
  flextv: [
    ...[
      ["popular", "Popular/Fokus", 1],
      ["new", "New/Baru", 2],
      ["chart", "Chart/Peringkat", 3],
      ["female", "For Her/Wanita", 7],
      ["male", "For Him/Pria", 9],
      ["anime", "Anime", 11]
    ].map(([value, label, id]) =>
      endpoint({
        value: String(value),
        label: String(label),
        description: `Mengambil drama FlexTV dari tab ${label}.`,
        pathLabel: `GET /api/v1/tabs/${id}`,
        supportsPage: true,
        defaultPage: 1,
        params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
      })
    )
  ],
  flickreels: [
    endpoint({
      value: "for-you",
      label: "For You",
      description: "Mengambil feed For You FlickReels.",
      pathLabel: "GET /api/v1/for-you",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("page_size", 10)]
    }),
    endpoint({
      value: "hot-rank",
      label: "Hot Rank",
      description: "Mengambil ranking populer FlickReels.",
      pathLabel: "GET /api/v1/hot-rank",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "category",
      label: "Category",
      description: "Mengambil drama FlickReels berdasarkan navigation_id.",
      pathLabel: "GET /api/v1/category",
      supportsPage: true,
      defaultPage: 1,
      params: [
        fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."),
        textParam("navigation_id", "Navigation ID", "88", "ID kategori dari endpoint helper /api/v1/navigation."),
        pageParam(1),
        pageSizeParam("page_size", 20)
      ]
    })
  ],
  freereels: [
    endpoint({
      value: "foryou",
      label: "For You",
      description: "Mengambil feed For You FreeReels.",
      pathLabel: "GET /api/v1/foryou",
      supportsPage: false,
      defaultPage: 0,
      params: [fixedParam("lang", "id-ID", "Bahasa Indonesia dikirim otomatis.")]
    }),
    ...["popular", "new", "female", "male", "dubbing"].map((route) =>
      endpoint({
        value: route,
        label: route,
        description: `Mengambil drama FreeReels endpoint ${route}.`,
        pathLabel: `GET /api/v1/${route}`,
        supportsPage: true,
        defaultPage: 0,
        params: [fixedParam("lang", "id-ID", "Bahasa Indonesia dikirim otomatis."), pageParam(0, 0)]
      })
    )
  ],
  fundrama: [
    endpoint({
      value: "dramas",
      label: "Drama List",
      description: "Mengambil daftar drama utama FunDrama.",
      pathLabel: "GET /api/v1/dramas",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("limit", 50)]
    })
  ],
  goodshort: [
    endpoint({
      value: "home",
      label: "Home",
      description: "Mengambil homepage drama GoodShort untuk channel Indonesia.",
      pathLabel: "GET /api/v1/home",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("channelId", 562, "Channel Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("pageSize", 12)]
    })
  ],
  hishort: [
    endpoint({
      value: "home",
      label: "Home",
      description: "Mengambil homepage popular HiShort.",
      pathLabel: "GET /api/v1/home",
      supportsPage: false,
      defaultPage: 1,
      params: []
    })
  ],
  melolo: [
    endpoint({
      value: "bookmall",
      label: "Bookmall",
      description: "Mengambil katalog utama Melolo Bookmall bahasa Indonesia.",
      pathLabel: "GET /api/v1/bookmall",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "bookmall-tabs",
      label: "Bookmall Tabs",
      description: "Mengambil katalog Melolo berdasarkan tab/gender dari Bookmall.",
      pathLabel: "GET /api/v1/bookmall/tabs",
      supportsPage: false,
      defaultPage: 1,
      params: [
        fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."),
        selectParam("gender", "Gender", "0", "Filter tab Melolo: semua, pria, atau wanita.", [
          { value: "0", label: "Semua" },
          { value: "1", label: "Pria" },
          { value: "2", label: "Wanita" }
        ])
      ]
    })
  ],
  meloshort: [
    endpoint({
      value: "dramas",
      label: "Discover utama",
      description: "Mengambil daftar utama MeloShort dari endpoint discover.",
      pathLabel: "GET /api/v1/dramas/discover",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("limit", 20)]
    }),
    endpoint({
      value: "discover",
      label: "Discover",
      description: "Mengambil daftar discover MeloShort.",
      pathLabel: "GET /api/v1/dramas/discover",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("limit", 20)]
    }),
    endpoint({
      value: "top",
      label: "Top Ranked",
      description: "Mengambil daftar top ranked MeloShort.",
      pathLabel: "GET /api/v1/dramas/top",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis.")]
    })
  ],
  microdrama: [
    endpoint({
      value: "dramas",
      label: "Drama List",
      description: "Mengambil daftar drama utama MicroDrama.",
      pathLabel: "GET /api/v1/dramas",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis."), pageSizeParam("limit", 50)]
    })
  ],
  minutedrama: [
    endpoint({
      value: "popular",
      label: "Popular",
      description: "Mengambil video populer MinuteDrama.",
      pathLabel: "GET /api/v1/popular",
      supportsPage: true,
      defaultPage: 1,
      params: [pageParam(1), pageSizeParam("size", 20), fixedParam("source", 1001, "Source default untuk detail video MinuteDrama.")]
    })
  ],
  netshort: [
    ...["feed", "explore", "new", "dubbing", "vip"].map((route) =>
      endpoint({
        value: route,
        label: route,
        description: `Mengambil NetShort endpoint ${route}.`,
        pathLabel: `GET /api/v1/${route}/:page`,
        supportsPage: true,
        defaultPage: 1,
        params: [fixedParam("lang", "id_ID", "Bahasa Indonesia dikirim otomatis."), pageParam(1)]
      })
    ),
    endpoint({
      value: "tab",
      label: "Custom Tab",
      description: "Mengambil NetShort berdasarkan tabId dari /api/v1/tabs.",
      pathLabel: "GET /api/v1/tab/:tabId/:page",
      supportsPage: true,
      defaultPage: 1,
      params: [
        fixedParam("lang", "id_ID", "Bahasa Indonesia dikirim otomatis."),
        textParam("tabId", "Tab ID", "1894702358019043329", "ID tab dari endpoint helper /api/v1/tabs."),
        pageParam(1)
      ]
    }),
    endpoint({
      value: "category",
      label: "Category",
      description: "Mengambil NetShort berdasarkan filter kategori.",
      pathLabel: "GET /api/v1/category/:page",
      supportsPage: true,
      defaultPage: 1,
      params: [
        fixedParam("lang", "id_ID", "Bahasa Indonesia dikirim otomatis."),
        pageParam(1),
        selectParam("region", "Region", "0", "Filter region: semua, lokal, Asia, atau Barat.", [
          { value: "0", label: "Semua" },
          { value: "1", label: "Lokal" },
          { value: "2", label: "Asia" },
          { value: "3", label: "Barat" }
        ]),
        selectParam("audio", "Audio", "0", "Filter audio: semua, subtitle, atau dubbed.", [
          { value: "0", label: "Semua" },
          { value: "1", label: "Subtitle" },
          { value: "2", label: "Dubbed" }
        ]),
        {
          name: "tagId",
          label: "Tag ID",
          type: "text",
          required: false,
          defaultValue: "",
          help: "Opsional. Tag level 3 dari endpoint helper /api/v1/categories."
        }
      ]
    })
  ],
  rapidtv: [
    endpoint({
      value: "dramas",
      label: "Drama List",
      description: "Mengambil daftar drama utama RapidTV.",
      pathLabel: "GET /api/v1/dramas",
      supportsPage: true,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis."), pageParam(1), pageSizeParam("size", 20)]
    })
  ],
  reelala: [
    endpoint({
      value: "home",
      label: "Home",
      description: "Mengambil homepage Reelala.",
      pathLabel: "GET /api/home",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "for-you",
      label: "For You",
      description: "Mengambil rekomendasi For You Reelala.",
      pathLabel: "GET /api/for-you",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "id", "Bahasa Indonesia dikirim otomatis.")]
    })
  ],
  reelife: [
    endpoint({
      value: "dramas",
      label: "Drama List",
      description: "Mengambil daftar drama Reelife berdasarkan tab.",
      pathLabel: "GET /api/v1/dramas",
      supportsPage: true,
      defaultPage: 1,
      params: [textParam("tab", "Tab", "", "Opsional. Tab/kategori Reelife."), pageParam(1), pageSizeParam("size", 20)]
    }),
    endpoint({
      value: "foryou",
      label: "For You",
      description: "Mengambil For You feed Reelife.",
      pathLabel: "GET /api/v1/foryou",
      supportsPage: true,
      defaultPage: 1,
      params: [pageParam(1), pageSizeParam("size", 20)]
    }),
    endpoint({
      value: "ranking",
      label: "Ranking",
      description: "Mengambil ranking Reelife berdasarkan rankId.",
      pathLabel: "GET /api/v1/ranking",
      supportsPage: false,
      defaultPage: 1,
      params: [textParam("rankId", "Rank ID", "1", "ID ranking Reelife.")]
    })
  ],
  reelshort: [
    endpoint({
      value: "foryou",
      label: "For You",
      description: "Mengambil feed For You ReelShort.",
      pathLabel: "GET /api/v1/foryou",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "new",
      label: "New Releases",
      description: "Mengambil rilis terbaru ReelShort.",
      pathLabel: "GET /api/v1/new",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "completed",
      label: "Completed",
      description: "Mengambil serial selesai ReelShort.",
      pathLabel: "GET /api/v1/completed",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "romance",
      label: "Romance",
      description: "Mengambil kategori Romance ReelShort.",
      pathLabel: "GET /api/v1/romance",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis.")]
    }),
    endpoint({
      value: "drama",
      label: "Drama",
      description: "Mengambil kategori Drama ReelShort.",
      pathLabel: "GET /api/v1/drama",
      supportsPage: false,
      defaultPage: 1,
      params: [fixedParam("lang", "in", "Bahasa Indonesia dikirim otomatis.")]
    })
  ]
};

export function getProviderCatalogSections(provider: ProviderCode) {
  return providerCatalogSections[provider] ?? [];
}

export function getProviderCatalogSection(provider: ProviderCode, section: string) {
  return getProviderCatalogSections(provider).find((item) => item.value === section) ?? null;
}

export function sectionValues(provider: ProviderCode) {
  return getProviderCatalogSections(provider).map((section) => section.value);
}

export function catalogStorageSection(section: string, params?: JsonRecord) {
  const identityParams = Object.entries(params ?? {})
    .filter(([key, value]) => !["page", "limit", "pageSize", "size", "page_size"].includes(key) && value !== "" && value !== null && value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  if (!identityParams.length) return section;

  const suffix = identityParams
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join(",");
  return `${section}:${suffix}`;
}

export function defaultCatalogParams(section: CatalogSectionDefinition): JsonRecord {
  const params: JsonRecord = {};
  for (const param of section.params) {
    if (param.type !== "fixed" && param.defaultValue !== undefined) {
      params[param.name] = param.defaultValue as JsonValue;
    }
  }
  return params;
}
