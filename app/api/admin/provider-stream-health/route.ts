import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getAdminFromRequest } from "@/lib/admin-auth";
import {
  checkAllProviderStreamHealth,
  checkProviderStreamHealth,
  getProviderRuntimeControls,
  setProviderHomepageVisibility,
} from "@/lib/provider-runtime-controls";
import { isActiveProviderType } from "@/lib/provider-adapter";

export const runtime = "nodejs";

async function requireAdmin(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const controls = await getProviderRuntimeControls();
  return NextResponse.json({ controls });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        provider?: string;
      }
    | null;

  const provider = payload?.provider?.trim() ?? "all";
  const controls =
    provider === "all"
      ? await checkAllProviderStreamHealth()
      : isActiveProviderType(provider)
        ? [await checkProviderStreamHealth(provider)]
        : null;

  if (!controls) {
    return NextResponse.json(
      { error: "Provider tidak valid." },
      { status: 400 },
    );
  }

  return NextResponse.json({ controls });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        provider?: string;
        isHomepageVisible?: boolean;
      }
    | null;

  const provider = payload?.provider?.trim() ?? "";

  if (!isActiveProviderType(provider) || typeof payload?.isHomepageVisible !== "boolean") {
    return NextResponse.json(
      { error: "Payload provider visibility tidak valid." },
      { status: 400 },
    );
  }

  await setProviderHomepageVisibility(provider, payload.isHomepageVisible);
  revalidateTag("catalog-home", "max");

  const controls = await getProviderRuntimeControls();

  return NextResponse.json({
    controls,
    message: payload.isHomepageVisible
      ? `Provider ${provider} kembali ditampilkan di homepage.`
      : `Provider ${provider} disembunyikan dari homepage.`,
  });
}
