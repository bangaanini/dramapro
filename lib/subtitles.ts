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
  return /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/.test(
    input,
  );
}
