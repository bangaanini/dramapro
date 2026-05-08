import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import {
  estimatePushNotificationTargets,
  PUSH_NOTIFICATION_AUDIENCES,
  type PushNotificationAudience,
} from "@/lib/push-notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      audience?: string;
      targetPayload?: unknown;
    };
    const audience = PUSH_NOTIFICATION_AUDIENCES.includes(
      payload.audience as PushNotificationAudience,
    )
      ? (payload.audience as PushNotificationAudience)
      : "all";
    const count = await estimatePushNotificationTargets({
      audience,
      targetPayload:
        typeof payload.targetPayload === "object" && payload.targetPayload
          ? payload.targetPayload
          : undefined,
    });

    return NextResponse.json({ count });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Estimasi target gagal dihitung.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
