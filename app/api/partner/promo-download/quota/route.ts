import { NextRequest, NextResponse } from "next/server";

import {
  getPartnerDownloadBotForOwner,
  getPartnerDownloadQuota,
} from "@/lib/partner-downloads";
import { getCurrentUser } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botUsername = request.nextUrl.searchParams.get("botUsername") ?? "";
  const partnerBot = await getPartnerDownloadBotForOwner({
    botUsername,
    ownerUserId: user.id,
  });

  if (!partnerBot) {
    return NextResponse.json(
      { error: "Bot partner tidak ditemukan untuk akun ini." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    botUsername: partnerBot.botUsername,
    quota: await getPartnerDownloadQuota({ bot: partnerBot, userId: user.id }),
  });
}
