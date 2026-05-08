import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import {
  parsePushSubscriptionInput,
  queuePushNotificationCampaign,
  registerPushSubscription,
} from "@/lib/push-notifications";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { getUserFromRequest } from "@/lib/user-auth";

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
    const payload = (await request.json()) as {
      body?: string;
      imageUrl?: string;
      subscription?: unknown;
      targetUrl?: string;
      title?: string;
    };
    const subscription = parsePushSubscriptionInput(payload.subscription);
    const user = await getUserFromRequest(request);
    const savedSubscription = await registerPushSubscription({
      browserName: "Admin browser",
      deviceLabel: "Admin test device",
      platformName: "Admin",
      subscription,
      userAgent: request.headers.get("user-agent") ?? "",
      userId: user?.id ?? null,
    });
    const campaign = await queuePushNotificationCampaign({
      adminUserId: admin.id,
      campaign: {
        audience: "all",
        body: payload.body || "Ini notifikasi test dari dashboard admin.",
        imageUrl: payload.imageUrl,
        targetPayload: {
          subscriptionIds: [savedSubscription.id],
        },
        targetUrl: payload.targetUrl || "/",
        title: payload.title || "Test Notifikasi Layar Drama",
        type: "custom",
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Test notifikasi gagal dibuat.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
