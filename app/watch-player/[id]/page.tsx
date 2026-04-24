import {
  generateWatchPlayerMetadata,
  WatchPlayerRoute,
} from "@/app/watch-player/[id]/player-route";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: Parameters<typeof WatchPlayerRoute>[0],
): Promise<Metadata> {
  return generateWatchPlayerMetadata(props);
}

export default WatchPlayerRoute;
