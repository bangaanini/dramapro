import type { NextConfig } from "next";

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
      { protocol: "https", hostname: "p19-novel-sg.ibyteimg.com" },
      { protocol: "https", hostname: "p16-novel-sg.ibyteimg.com" },
      { protocol: "https", hostname: "s.shortswave.com" },
      { protocol: "https", hostname: "static.shortswave.com" },
      { protocol: "https", hostname: "acfs1.goodreels.com" },
      { protocol: "https", hostname: "static-v1.mydramawave.com" },
      { protocol: "https", hostname: "v-mps.crazymaplestudios.com" },
      { protocol: "https", hostname: "awscover.netshort.com" },
      { protocol: "https", hostname: "zshipubcdn.farsunpteltd.com" },
      { protocol: "https", hostname: "zshipricf.farsunpteltd.com" },
      { protocol: "https", hostname: "hwztchapter.dramaboxdb.com" },
      { protocol: "https", hostname: "hwztvideo.dramaboxdb.com" },
      { protocol: "https", hostname: "cdn.dramadash.app" },
      { protocol: "https", hostname: "ccdn.dramahub.me" },
      { protocol: "https", hostname: "volcengine-forward.shorttv.live" },
      { protocol: "https", hostname: "akamai-static.shorttv.live" },
      { protocol: "https", hostname: "pbcdnw.aoneroom.com" },
      { protocol: "https", hostname: "api.dracinku.site" },
      { protocol: "https", hostname: "dl.lite.tv" },
      { protocol: "https", hostname: "rtp.topinnovations.co" },
      { protocol: "https", hostname: "image.fishnovel.com" },
      { protocol: "https", hostname: "cdn.shorten.watch" },
    ],
  },
};

export default nextConfig;
