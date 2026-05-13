import { NextRequest } from "next/server";

import { isStreamApiProviderCode } from "@/lib/provider-sync";
import { normalizeSubtitleToVtt } from "@/lib/subtitles";
import type { ProviderCode } from "@/lib/streamapi/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInteger(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeLang(value: string | null) {
  const lang = value?.trim().toLowerCase() || "id";
  return lang === "id-id" ? "id" : lang.split("-")[0] || "id";
}

function normalizeMoboReelsLangId(lang: string) {
  return ["id", "in", "ind", "indo", "indonesia", "indonesian"].includes(lang)
    ? "11"
    : lang;
}

function buildUpstreamSubtitleUrl(input: {
  provider: ProviderCode;
  externalId: string;
  episode: number | null;
  lang: string;
  token: string;
}) {
  if (input.provider === "bilitv") {
    if (!input.episode) return null;

    const url = new URL(`https://streamapi.web.id/p/bilitv/api/v1/subtitle/${encodeURIComponent(input.externalId)}/${input.episode}`);
    url.searchParams.set("lang", input.lang);
    url.searchParams.set("format", "vtt");
    url.searchParams.set("token", input.token);
    return url;
  }

  if (input.provider === "moboreels") {
    const url = new URL("https://streamapi.web.id/p/moboreels/api/proxy/subtitle");
    url.searchParams.set("episId", input.externalId);
    url.searchParams.set("langId", normalizeMoboReelsLangId(input.lang));
    url.searchParams.set("token", input.token);
    return url;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider")?.trim() ?? "";
  const externalId = request.nextUrl.searchParams.get("externalId")?.trim() ?? "";
  const episode = parsePositiveInteger(request.nextUrl.searchParams.get("episode"));
  const lang = normalizeLang(request.nextUrl.searchParams.get("lang"));

  if (
    !isStreamApiProviderCode(provider) ||
    !["bilitv", "moboreels"].includes(provider)
  ) {
    return Response.json({ error: "Provider subtitle tidak didukung." }, { status: 400 });
  }

  if (!externalId || (provider === "bilitv" && !episode)) {
    return Response.json(
      { error: "Parameter subtitle tidak valid." },
      { status: 400 },
    );
  }

  const token = process.env.STREAMAPI_TOKEN?.trim();
  if (!token) {
    return Response.json(
      { error: "STREAMAPI_TOKEN belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const url = buildUpstreamSubtitleUrl({ provider, externalId, episode, lang, token });
  if (!url) {
    return Response.json({ error: "Provider subtitle tidak didukung." }, { status: 400 });
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/vtt,*/*",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return Response.json(
      { error: "Subtitle upstream tidak tersedia.", status: response.status },
      { status: 502 },
    );
  }

  const subtitle = normalizeSubtitleToVtt(await response.text());
  if (!subtitle) {
    return Response.json(
      { error: "Format subtitle upstream tidak didukung." },
      { status: 502 },
    );
  }

  return new Response(subtitle, {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
