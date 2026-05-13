import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("value")?.trim() ?? "";

  if (!value || value.length < 16 || value.length > 64) {
    return Response.json({ error: "Invalid HLS key." }, { status: 400 });
  }

  return new Response(Buffer.from(value, "utf8"), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
