import type { MetadataRoute } from "next";

import { getAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getAppSettings();

  return {
    name: settings.site.name,
    short_name: settings.site.name,
    description: settings.site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#120c0b",
    theme_color: "#120c0b",
    lang: "id-ID",
    icons: [
      {
        src: "/favicon_io/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon_io/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon_io/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
