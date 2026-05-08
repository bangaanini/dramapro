import { NextResponse } from "next/server";

import { getWebPushConfig } from "@/lib/push-notifications";

export const runtime = "nodejs";

export async function GET() {
  const config = getWebPushConfig();

  return NextResponse.json({
    enabled: config.enabled,
    publicKey: config.publicKey,
  });
}
