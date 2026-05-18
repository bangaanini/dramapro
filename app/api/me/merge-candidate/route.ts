import { NextRequest, NextResponse } from "next/server";

import {
  findMergeCandidate,
  getUserFromRequest,
  maskEmail,
} from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.hasWebAccount) {
    return NextResponse.json({ candidate: null });
  }

  if (!user.telegramUsername) {
    return NextResponse.json({ candidate: null });
  }

  const candidate = await findMergeCandidate(user.id, user.telegramUsername);

  if (!candidate || !candidate.email) {
    return NextResponse.json({ candidate: null });
  }

  const dismissed = request.cookies.get(
    `dramapro_merge_dismissed_${candidate.id}`,
  );

  if (dismissed) {
    return NextResponse.json({ candidate: null });
  }

  return NextResponse.json({
    candidate: {
      candidateId: candidate.id,
      maskedEmail: maskEmail(candidate.email),
    },
  });
}
