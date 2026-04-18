import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
