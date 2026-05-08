import { NextRequest, NextResponse } from "next/server";

import {
  deactivatePushSubscription,
  parsePushSubscriptionInput,
  registerPushSubscription,
} from "@/lib/push-notifications";
import { isTrustedSameOriginRequest } from "@/lib/request-origin";
import { getUserFromRequest } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as {
      browserName?: string;
      deviceLabel?: string;
      platformName?: string;
      subscription?: unknown;
    };
    const subscription = parsePushSubscriptionInput(payload.subscription);
    const user = await getUserFromRequest(request);
    const saved = await registerPushSubscription({
      browserName: payload.browserName,
      deviceLabel: payload.deviceLabel,
      platformName: payload.platformName,
      subscription,
      userAgent: request.headers.get("user-agent") ?? "",
      userId: user?.id ?? null,
    });

    return NextResponse.json({
      id: saved.id,
      isActive: saved.isActive,
      userId: saved.userId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription gagal disimpan.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as {
      endpoint?: unknown;
      subscription?: unknown;
    };
    const endpoint =
      typeof payload.endpoint === "string"
        ? payload.endpoint.trim()
        : parsePushSubscriptionInput(payload.subscription).endpoint;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint wajib diisi." }, { status: 400 });
    }

    await deactivatePushSubscription(endpoint);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription gagal dinonaktifkan.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
