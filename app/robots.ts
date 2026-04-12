import type { MetadataRoute } from "next";

import { absoluteResolvedUrl, getResolvedSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/watch/", "/search", "/vip", "/affiliate"],
        disallow: ["/admin", "/api", "/profile", "/sign-in", "/sign-up", "/vip/checkout"],
      },
    ],
    sitemap: await absoluteResolvedUrl("/sitemap.xml"),
    host: await getResolvedSiteUrl(),
  };
}
