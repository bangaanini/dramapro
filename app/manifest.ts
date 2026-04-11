import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DramaPro",
    short_name: "DramaPro",
    description:
      "Streaming aggregator short drama dengan metadata lokal, playback fresh on demand, dan pengalaman mobile-first.",
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
