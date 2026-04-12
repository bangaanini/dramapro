import { NextRequest, NextResponse } from "next/server";

import { getAdminUsersTableData } from "@/lib/admin-users-data";
import { getAdminFromRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const page = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(
    request.nextUrl.searchParams.get("pageSize") ?? "20",
    10,
  );

  const data = await getAdminUsersTableData({
    query,
    page,
    pageSize,
  });

  return NextResponse.json(data);
}
