import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("catalog-home", "max");
  revalidateTag("catalog-shortcuts", "max");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    message:
      "Cache katalog berhasil direfresh. Homepage dan pencarian akan membaca ulang data terbaru dari database.",
  });
}
