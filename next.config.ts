import type { NextConfig } from "next";

const streamProviderImageHosts = [
  "cashdrama-vod.jowo.tv",
  "cdn-oss.miniepisode.media",
  "cover.vividshort.com",
  "p19-novel-sg.ibyteimg.com",
  "p16-novel-sg.ibyteimg.com",
  "s.shortswave.com",
  "static.shortswave.com",
  "acfs1.goodreels.com",
  "static-v1.mydramawave.com",
  "v-mps.crazymaplestudios.com",
  "awscover.netshort.com",
  "zshipubcdn.farsunpteltd.com",
  "zshipricf.farsunpteltd.com",
  "hwztchapter.dramaboxdb.com",
  "hwztvideo.dramaboxdb.com",
  "cdn.dramadash.app",
  "ccdn.dramahub.me",
  "volcengine-forward.shorttv.live",
  "akamai-static.shorttv.live",
  "pbcdnw.aoneroom.com",
  "dl.lite.tv",
  "rtp.topinnovations.co",
  "image.fishnovel.com",
  "cdn.shorten.watch",
  "streamapi.web.id",
];

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/watch/:id/play",
          destination: "/watch-player/:id",
        },
      ],
    };
  },
  images: {
    remotePatterns: [
      ...streamProviderImageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
      { protocol: "https", hostname: "**.jowo.tv" },
      { protocol: "https", hostname: "**.miniepisode.media" },
      { protocol: "https", hostname: "**.vividshort.com" },
      { protocol: "https", hostname: "**.shorttv.live" },
      { protocol: "https", hostname: "**.dramaboxdb.com" },
      { protocol: "https", hostname: "**.farsunpteltd.com" },
      { protocol: "https", hostname: "**.shortswave.com" },
      { protocol: "https", hostname: "**.goodreels.com" },
      { protocol: "https", hostname: "**.mydramawave.com" },
      { protocol: "https", hostname: "**.crazymaplestudios.com" },
      { protocol: "https", hostname: "**.netshort.com" },
      { protocol: "https", hostname: "**.dramadash.app" },
      { protocol: "https", hostname: "**.dramahub.me" },
      { protocol: "https", hostname: "**.aoneroom.com" },
      { protocol: "https", hostname: "**.lite.tv" },
      { protocol: "https", hostname: "**.topinnovations.co" },
      { protocol: "https", hostname: "**.fishnovel.com" },
      { protocol: "https", hostname: "**.shorten.watch" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
