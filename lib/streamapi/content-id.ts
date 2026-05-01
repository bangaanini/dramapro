import type { ProviderCode } from "@/lib/streamapi/types";

export interface DramaIdParts {
  provider: ProviderCode;
  externalId: string;
  lang: string;
}

export interface EpisodeIdParts extends DramaIdParts {
  episodeExternalId: string;
  episodeNumber: number;
}

function encode(parts: Record<string, string | number>) {
  return Buffer.from(JSON.stringify(parts)).toString("base64url");
}

function decode(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
}

export function makeDramaId(parts: DramaIdParts) {
  return `drm_${encode({
    p: parts.provider,
    e: parts.externalId,
    l: parts.lang
  })}`;
}

export function makeEpisodeId(parts: EpisodeIdParts) {
  return `eps_${encode({
    p: parts.provider,
    d: parts.externalId,
    l: parts.lang,
    ee: parts.episodeExternalId,
    n: parts.episodeNumber
  })}`;
}

export function parseDramaId(id: string): DramaIdParts | null {
  if (!id.startsWith("drm_")) return null;
  const payload = decode(id.slice(4));
  if (typeof payload.p !== "string" || typeof payload.e !== "string" || typeof payload.l !== "string") {
    return null;
  }
  return {
    provider: payload.p as ProviderCode,
    externalId: payload.e,
    lang: payload.l
  };
}

export function parseEpisodeId(id: string): EpisodeIdParts | null {
  if (!id.startsWith("eps_")) return null;
  const payload = decode(id.slice(4));
  if (
    typeof payload.p !== "string" ||
    typeof payload.d !== "string" ||
    typeof payload.l !== "string" ||
    typeof payload.ee !== "string" ||
    typeof payload.n !== "number"
  ) {
    return null;
  }
  return {
    provider: payload.p as ProviderCode,
    externalId: payload.d,
    lang: payload.l,
    episodeExternalId: payload.ee,
    episodeNumber: payload.n
  };
}
