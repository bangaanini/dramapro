import { NextRequest } from "next/server";
import type { IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

const MEDIA_HEADERS = {
  Accept: "*/*",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");
  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";
  const requestedFilename = request.nextUrl.searchParams.get("filename");

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
  const upstreamHeaders = {
    ...MEDIA_HEADERS,
    ...(rangeHeader ? { Range: rangeHeader } : {}),
  };
  const upstreamResponse = await fetchUpstreamMedia(upstreamUrl, upstreamHeaders);

  if (!upstreamResponse.ok) {
    return Response.json(
      {
        error: "Upstream media request failed.",
        status: upstreamResponse.status,
      },
      { status: 502 },
    );
  }

  const contentType = (upstreamResponse.headers.get("content-type") ?? "").toLowerCase();
  const responseUrl = upstreamResponse.url ? new URL(upstreamResponse.url) : upstreamUrl;
  const normalizedPathname = responseUrl.pathname.toLowerCase();
  const normalizedSearch = responseUrl.search.toLowerCase();
  const hasTextMimeQuery =
    normalizedSearch.includes("mime_type=text") ||
    normalizedSearch.includes("mime_type=application_x-subrip") ||
    normalizedSearch.includes("mime_type=application%2fx-subrip");
  const isPlaylist =
    normalizedPathname.endsWith(".m3u8") ||
    normalizedPathname.includes("m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("audio/x-mpegurl");
  const isSubtitle =
    normalizedPathname.endsWith(".vtt") ||
    normalizedPathname.endsWith(".srt") ||
    normalizedPathname.includes("/subtitle") ||
    hasTextMimeQuery ||
    contentType.includes("text/vtt") ||
    contentType.includes("application/x-subrip") ||
    (hasTextMimeQuery && contentType.includes("text/plain"));

  if (isPlaylist) {
    const playlist = await upstreamResponse.text();
    const rewritten = rewritePlaylist(playlist, responseUrl);

    return new Response(rewritten, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/x-mpegURL; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (isSubtitle) {
    const subtitleText = await upstreamResponse.text();
    const subtitleBody = normalizeSubtitleToVtt(subtitleText);

    if (!subtitleBody) {
      return Response.json(
        { error: "Unsupported subtitle format." },
        { status: 415 },
      );
    }

    return new Response(subtitleBody, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
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

  if (shouldDownload) {
    const filename = sanitizeDownloadFilename(
      requestedFilename || upstreamUrl.pathname.split("/").pop() || "video.mp4",
    );

    headers.set(
      "content-disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}

type UpstreamMediaResponse = {
  ok: boolean;
  status: number;
  headers: Headers;
  url: string;
  body: ReadableStream<Uint8Array> | null;
  text: () => Promise<string>;
};

async function fetchUpstreamMedia(
  upstreamUrl: URL,
  headers: Record<string, string>,
): Promise<UpstreamMediaResponse> {
  try {
    return await fetch(upstreamUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (!shouldAllowInsecureMediaFallback(upstreamUrl) || !isTlsCertificateError(error)) {
      throw error;
    }

    return fetchWithInsecureTls(upstreamUrl, headers);
  }
}

function shouldAllowInsecureMediaFallback(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return hostname === "awscdn.netshort.com" || hostname.endsWith(".netshort.com");
}

function isTlsCertificateError(error: unknown) {
  const cause = error instanceof Error ? error.cause : null;
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code?: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : "";

  return (
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    message.includes("certificate")
  );
}

async function fetchWithInsecureTls(
  upstreamUrl: URL,
  headers: Record<string, string>,
  redirectCount = 0,
): Promise<UpstreamMediaResponse> {
  if (redirectCount > 5) {
    throw new Error("Too many upstream media redirects.");
  }

  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      upstreamUrl,
      {
        headers,
        rejectUnauthorized: false,
      },
      (response) => {
        const location = response.headers.location;

        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          location
        ) {
          response.resume();
          resolve(
            fetchWithInsecureTls(
              new URL(Array.isArray(location) ? location[0] : location, upstreamUrl),
              headers,
              redirectCount + 1,
            ),
          );
          return;
        }

        resolve(toUpstreamMediaResponse(response, upstreamUrl.toString()));
      },
    );

    request.setTimeout(30_000, () => {
      request.destroy(new Error("Upstream media request timed out."));
    });
    request.on("error", reject);
    request.end();
  });
}

function toUpstreamMediaResponse(response: IncomingMessage, url: string): UpstreamMediaResponse {
  return {
    ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
    status: response.statusCode ?? 502,
    headers: incomingHeadersToHeaders(response.headers),
    url,
    body: Readable.toWeb(response) as ReadableStream<Uint8Array>,
    text: () => readIncomingMessageText(response),
  };
}

function incomingHeadersToHeaders(headers: IncomingMessage["headers"]) {
  const nextHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      nextHeaders.set(key, value.join(", "));
    } else if (value) {
      nextHeaders.set(key, value);
    }
  }

  return nextHeaders;
}

async function readIncomingMessageText(response: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of response) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
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

  if (
    trimmed.startsWith("#EXT-X-KEY:") &&
    trimmed.includes('URI="local://offline-key')
  ) {
    return "";
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

function normalizeSubtitleToVtt(input: string) {
  const normalized = input.replace(/\r+/g, "");

  if (normalized.trimStart().startsWith("WEBVTT")) {
    return normalized;
  }

  if (!looksLikeSrtSubtitle(normalized)) {
    return null;
  }

  const body = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2",
  );

  return `WEBVTT\n\n${body}`;
}

function looksLikeSrtSubtitle(input: string) {
  return /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/.test(input);
}

function sanitizeDownloadFilename(value: string) {
  return value.replace(/[^\w.\-]+/g, "-").slice(0, 120) || "video.mp4";
}
