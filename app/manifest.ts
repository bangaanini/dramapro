import type { MetadataRoute } from "next";

import { getAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

const PWA_APP_NAME = "Layar Drama";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getAppSettings();

  return {
    name: PWA_APP_NAME,
    short_name: PWA_APP_NAME,
    description: settings.site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#120c0b",
    theme_color: "#120c0b",
    lang: "id-ID",
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
