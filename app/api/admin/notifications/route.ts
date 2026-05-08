import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import { queuePushNotificationCampaign } from "@/lib/push-notifications";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const campaign = await queuePushNotificationCampaign({
      adminUserId: admin.id,
      campaign: payload,
    });

    return NextResponse.json(campaign);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Notifikasi gagal masuk queue.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
