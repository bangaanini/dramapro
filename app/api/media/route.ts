import { NextRequest } from "next/server";

const MEDIA_HEADERS = {
  Accept: "*/*",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");

  if (!sourceUrl) {
    return Response.json({ error: "Missing media `url` query param." }, { status: 400 });
  }

  let upstreamUrl: URL;

  try {
    upstreamUrl = new URL(sourceUrl);
  } catch {
    return Response.json({ error: "Invalid media url." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(upstreamUrl.protocol)) {
    return Response.json({ error: "Unsupported media protocol." }, { status: 400 });
  }

  const rangeHeader = request.headers.get("range");
  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      ...MEDIA_HEADERS,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });

  if (!upstreamResponse.ok) {
    return Response.json(
      {
        error: "Upstream media request failed.",
        status: upstreamResponse.status,
      },
      { status: 502 },
    );
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  const isPlaylist =
    upstreamUrl.pathname.endsWith(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("audio/x-mpegurl");

  if (isPlaylist) {
    const playlist = await upstreamResponse.text();
    const rewritten = rewritePlaylist(playlist, upstreamUrl);

    return new Response(rewritten, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/x-mpegURL; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  const headers = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "accept-ranges",
    "content-range",
    "cache-control",
    "etag",
    "last-modified",
  ];

  for (const header of passthroughHeaders) {
    const value = upstreamResponse.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}

function rewritePlaylist(playlist: string, baseUrl: URL) {
  return playlist
    .split(/\r?\n/)
    .map((line) => rewritePlaylistLine(line, baseUrl))
    .join("\n");
}

function rewritePlaylistLine(line: string, baseUrl: URL) {
  const trimmed = line.trim();

  if (!trimmed) {
    return line;
  }

  if (!trimmed.startsWith("#")) {
    return buildProxyLine(trimmed, baseUrl);
  }

  if (trimmed.includes('URI="')) {
    return trimmed.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
      return `URI="${buildProxyLine(uri, baseUrl)}"`;
    });
  }

  return line;
}

function buildProxyLine(target: string, baseUrl: URL) {
  const resolved = new URL(target, baseUrl).toString();
  return `/api/media?url=${encodeURIComponent(resolved)}`;
}
