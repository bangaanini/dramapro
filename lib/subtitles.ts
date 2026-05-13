export type SubtitleCandidate = {
  label: string;
  language: string;
  url: string;
};

export function findIndonesianSubtitle<T extends SubtitleCandidate>(
  subtitles: T[],
) {
  return (
    subtitles.find((subtitle) => {
      const language = subtitle.language.trim().toLowerCase().replace(/_/g, "-");
      const label = subtitle.label.trim().toLowerCase();

      return (
        ["id", "in", "ind", "indo", "id-id", "ind-id", "in-id"].includes(
          language,
        ) ||
        label.includes("indonesia") ||
        label.includes("indonesian") ||
        label === "id" ||
        label === "in"
      );
    }) ?? null
  );
}

export function normalizeSubtitleToVtt(input: string) {
  const normalized = input.replace(/^\uFEFF/u, "").replace(/\r+/g, "");
  const cleaned = removeSubtitleDisplayMetadata(normalized);

  if (cleaned.trimStart().startsWith("WEBVTT")) {
    return cleaned;
  }

  if (!looksLikeSrtSubtitle(cleaned)) {
    return null;
  }

  const body = cleaned.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2",
  );

  return `WEBVTT\n\n${body}`;
}

function looksLikeSrtSubtitle(input: string) {
  return /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/.test(
    input,
  );
}

function removeSubtitleDisplayMetadata(input: string) {
  return input
    .replace(
      /\[\s*region\s*=\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?){3}\s*\][^\S\n]*/gi,
      "",
    )
    .replace(
      /(^|\n)([^\S\n]*)\([^)\n]{1,160}\s[-–—]\s[^)\n]{1,200}\)[^\S\n]*/g,
      "$1$2",
    );
}
