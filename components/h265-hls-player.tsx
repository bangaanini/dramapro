"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { useEffect, useRef, useState } from "react";

const WORKER_POOL_SIZE = 2;
const CHUNK_DURATION_TARGET = 10;
const DOWNLOAD_CONCURRENCY = 4;

function isMultiThreadAvailable() {
  return typeof SharedArrayBuffer !== "undefined";
}

async function loadFfmpeg() {
  const multiThread = isMultiThreadAvailable();
  const baseUrl = window.location.origin;
  const publicPath = multiThread ? "/ffmpeg-mt" : "/ffmpeg";
  const options: {
    coreURL: string;
    wasmURL: string;
    workerURL?: string;
  } = {
    coreURL: await toBlobURL(
      `${baseUrl}${publicPath}/ffmpeg-core.js`,
      "text/javascript",
    ),
    wasmURL: await toBlobURL(
      `${baseUrl}${publicPath}/ffmpeg-core.wasm`,
      "application/wasm",
    ),
  };

  if (multiThread) {
    options.workerURL = await toBlobURL(
      `${baseUrl}${publicPath}/ffmpeg-core.worker.js`,
      "text/javascript",
    );
  }

  const ffmpeg = new FFmpeg();
  await ffmpeg.load(options);
  return ffmpeg;
}

function parseM3u8(text: string, baseUrl: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const segments: Array<{ url: string; duration: number }> = [];
  let duration = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.startsWith("#EXTINF:")) {
      continue;
    }

    duration = Number.parseFloat(line.split(":")[1] ?? "0");
    const segmentUrl = lines[index + 1];

    if (segmentUrl && !segmentUrl.startsWith("#")) {
      segments.push({
        url: segmentUrl.startsWith("http")
          ? segmentUrl
          : new URL(segmentUrl, baseUrl).href,
        duration,
      });
      index += 1;
    }
  }

  return segments;
}

async function downloadSegments(
  segments: Array<{ url: string }>,
  onProgress: (progress: number) => void,
) {
  const results = new Array<Uint8Array>(segments.length);
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < segments.length) {
      const index = cursor;
      cursor += 1;

      const response = await fetch(segments[index].url, {
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`Segment request failed: ${response.status}`);
      }

      results[index] = new Uint8Array(await response.arrayBuffer());
      completed += 1;
      onProgress(Math.round((completed / segments.length) * 100));
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(DOWNLOAD_CONCURRENCY, segments.length) },
      worker,
    ),
  );
  return results;
}

function detectMimeType() {
  const candidates = [
    'video/mp4; codecs="avc1.64001F,mp4a.40.2"',
    'video/mp4; codecs="avc1.4D401F,mp4a.40.2"',
    'video/mp4; codecs="avc1.42E01F,mp4a.40.2"',
    'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
  ];

  return (
    candidates.find((candidate) => MediaSource.isTypeSupported(candidate)) ??
    'video/mp4; codecs="avc1.42E01E,mp4a.40.2"'
  );
}

function buildChunkGroups(segments: Array<{ duration: number }>) {
  const groups: number[][] = [];
  let currentGroup: number[] = [];
  let duration = 0;

  for (let index = 0; index < segments.length; index += 1) {
    currentGroup.push(index);
    duration += segments[index].duration || 0;

    if (duration >= CHUNK_DURATION_TARGET) {
      groups.push(currentGroup);
      currentGroup = [];
      duration = 0;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function buildExecArgs(listName: string, outName: string) {
  return [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listName,
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "28",
    "-vf",
    "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-ar",
    "44100",
    "-threads",
    "1",
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "-f",
    "mp4",
    outName,
  ];
}

type H265HlsPlayerProps = {
  bindVideoElement?: (video: HTMLVideoElement | null) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
  onPause?: () => void;
  onPlay?: () => void;
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number, duration?: number) => void;
  src: string;
};

export function H265HlsPlayer({
  bindVideoElement,
  onEnded,
  onError,
  onPause,
  onPlay,
  onReady,
  onTimeUpdate,
  src,
}: H265HlsPlayerProps) {
  const totalDurationRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const appendingRef = useRef(false);
  const hasStartedRef = useRef(false);

  const [phase, setPhase] = useState("init");
  const [downloadPct, setDownloadPct] = useState(0);
  const [transcodePct, setTranscodePct] = useState(0);
  const [chunksDone, setChunksDone] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    bindVideoElement?.(video);

    return () => bindVideoElement?.(null);
  }, [bindVideoElement]);

  function appendNext() {
    if (appendingRef.current || queueRef.current.length === 0) {
      return;
    }

    const sourceBuffer = sourceBufferRef.current;

    if (!sourceBuffer || sourceBuffer.updating) {
      return;
    }

    appendingRef.current = true;
    sourceBuffer.appendBuffer(queueRef.current.shift()!);
  }

  useEffect(() => {
    if (!src) {
      return;
    }

    let cancelled = false;
    const ffmpegs: FFmpeg[] = [];

    setPhase("loading-ffmpeg");
    setDownloadPct(0);
    setTranscodePct(0);
    setChunksDone(0);
    setTotalChunks(0);
    setHasStarted(false);
    hasStartedRef.current = false;
    queueRef.current = [];
    appendingRef.current = false;

    async function run() {
      try {
        const [primaryFfmpeg, manifestResponse] = await Promise.all([
          loadFfmpeg(),
          fetch(src, { signal: AbortSignal.timeout(10_000) }),
        ]);
        ffmpegs.push(primaryFfmpeg);

        if (!manifestResponse.ok) {
          throw new Error(`Manifest request failed: ${manifestResponse.status}`);
        }

        if (cancelled) {
          return;
        }

        const manifest = await manifestResponse.text();
        const segments = parseM3u8(manifest, src);

        if (segments.length === 0) {
          throw new Error("Tidak ada segmen HLS yang bisa diproses.");
        }

        totalDurationRef.current = segments.reduce(
          (total, segment) => total + (segment.duration || 0),
          0,
        );
        setPhase("downloading");

        const poolSize = Math.min(WORKER_POOL_SIZE, segments.length);
        const [segmentBytes, extraFfmpegs] = await Promise.all([
          downloadSegments(segments, (progress) => {
            if (!cancelled) {
              setDownloadPct(progress);
            }
          }),
          Promise.all(
            Array.from({ length: Math.max(0, poolSize - 1) }, () =>
              loadFfmpeg(),
            ),
          ),
        ]);

        if (cancelled) {
          extraFfmpegs.forEach((ffmpeg) => ffmpeg.terminate());
          return;
        }

        ffmpegs.push(...extraFfmpegs);

        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;

        if (!videoRef.current) {
          throw new Error("Video element belum siap.");
        }

        videoRef.current.src = URL.createObjectURL(mediaSource);

        await new Promise<void>((resolve) => {
          mediaSource.addEventListener("sourceopen", () => resolve(), {
            once: true,
          });
        });

        if (cancelled) {
          return;
        }

        const sourceBuffer = mediaSource.addSourceBuffer(detectMimeType());
        sourceBuffer.mode = "sequence";
        sourceBufferRef.current = sourceBuffer;

        const chunkGroups = buildChunkGroups(segments);
        const chunkCount = chunkGroups.length;
        const chunkProgress = new Array(chunkCount).fill(0);
        const chunkResults = new Array<ArrayBuffer>(chunkCount);
        let flushPointer = 0;
        let doneCount = 0;
        let nextChunkIndex = 0;

        setTotalChunks(chunkCount);
        setPhase("transcoding");

        function updateProgress() {
          const total = chunkProgress.reduce((sum, value) => sum + value, 0);
          setTranscodePct(Math.min(100, Math.round((total / chunkCount) * 100)));
        }

        function tryStartPlayback() {
          if (hasStartedRef.current || !videoRef.current?.buffered.length) {
            return;
          }

          hasStartedRef.current = true;
          setHasStarted(true);
          void videoRef.current.play().catch(() => undefined);
          onReady?.();
        }

        function flushReadyChunks() {
          while (
            flushPointer < chunkCount &&
            chunkResults[flushPointer] !== undefined
          ) {
            const buffer = chunkResults[flushPointer];
            flushPointer += 1;

            if (buffer.byteLength > 0) {
              queueRef.current.push(buffer);
            }
          }

          appendNext();

          if (
            flushPointer >= chunkCount &&
            queueRef.current.length === 0 &&
            !appendingRef.current
          ) {
            try {
              mediaSource.endOfStream();
            } catch {}
            setPhase("done");
            tryStartPlayback();
          }
        }

        sourceBuffer.addEventListener("updateend", () => {
          appendingRef.current = false;
          tryStartPlayback();
          appendNext();
          flushReadyChunks();
        });

        async function transcodeChunk(ffmpeg: FFmpeg, chunkIndex: number) {
          const group = chunkGroups[chunkIndex];
          const listName = `list_${chunkIndex}.txt`;
          const outName = `out_${chunkIndex}.mp4`;
          const listLines: string[] = [];

          for (const segmentIndex of group) {
            const inputName = `in_${chunkIndex}_${segmentIndex}.ts`;
            await ffmpeg.writeFile(inputName, segmentBytes[segmentIndex]);
            listLines.push(`file '${inputName}'`);
          }

          await ffmpeg.writeFile(
            listName,
            new TextEncoder().encode(listLines.join("\n")),
          );

          const onProgress = ({ progress }: { progress: number }) => {
            if (progress >= 0 && progress <= 1) {
              chunkProgress[chunkIndex] = progress;
              updateProgress();
            }
          };

          try {
            ffmpeg.on("progress", onProgress);
            await ffmpeg.exec(buildExecArgs(listName, outName));
            ffmpeg.off("progress", onProgress);

            const output = await ffmpeg.readFile(outName);
            const outputBytes =
              typeof output === "string"
                ? new TextEncoder().encode(output)
                : output;
            const copiedOutput = new Uint8Array(outputBytes.byteLength);
            copiedOutput.set(outputBytes);
            chunkResults[chunkIndex] = copiedOutput.buffer;
          } catch {
            chunkResults[chunkIndex] = new ArrayBuffer(0);
          } finally {
            ffmpeg.off("progress", onProgress);

            for (const segmentIndex of group) {
              void ffmpeg.deleteFile(`in_${chunkIndex}_${segmentIndex}.ts`).catch(
                () => undefined,
              );
            }
            void ffmpeg.deleteFile(listName).catch(() => undefined);
            void ffmpeg.deleteFile(outName).catch(() => undefined);

            chunkProgress[chunkIndex] = 1;
            doneCount += 1;
            setChunksDone(doneCount);
            updateProgress();
            flushReadyChunks();
          }
        }

        async function worker(ffmpeg: FFmpeg) {
          while (!cancelled) {
            const chunkIndex = nextChunkIndex;
            nextChunkIndex += 1;

            if (chunkIndex >= chunkCount) {
              return;
            }

            await transcodeChunk(ffmpeg, chunkIndex);
          }
        }

        await Promise.all(ffmpegs.map((ffmpeg) => worker(ffmpeg)));

        if (!cancelled) {
          flushReadyChunks();
        }
      } catch (error) {
        if (!cancelled) {
          setPhase("error");
          onError?.(
            error instanceof Error
              ? error.message
              : "Fallback HEVC gagal dijalankan.",
          );
        }
      }
    }

    void run();
    const cleanupVideo = videoRef.current;

    return () => {
      cancelled = true;
      ffmpegs.forEach((ffmpeg) => ffmpeg.terminate());

      try {
        mediaSourceRef.current?.endOfStream();
      } catch {}

      if (cleanupVideo) {
        cleanupVideo.removeAttribute("src");
        cleanupVideo.load();
      }
    };
  }, [onError, onReady, src]);

  const phaseLabel =
    {
      "loading-ffmpeg": "Loading decoder...",
      downloading: `Downloading segmen... ${downloadPct}%`,
      transcoding: `Transcoding ${chunksDone}/${totalChunks} chunk... ${transcodePct}%`,
    }[phase] ?? "";
  const showOverlay = !["done", "init", "error"].includes(phase) && !hasStarted;
  const progress =
    phase === "downloading"
      ? downloadPct
      : phase === "transcoding"
        ? transcodePct
        : 0;

  return (
    <div className="absolute inset-0 size-full bg-black">
      <video
        ref={videoRef}
        className="size-full object-contain"
        controls={false}
        onEnded={onEnded}
        onPause={onPause}
        onPlay={onPlay}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          const duration = totalDurationRef.current || video.duration;
          onTimeUpdate?.(
            video.currentTime,
            duration > 0 ? duration : undefined,
          );
        }}
        playsInline
      />

      {showOverlay ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 px-8 text-center">
          <div className="size-10 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
          <p className="text-sm text-white/70">{phaseLabel}</p>
          {progress > 0 ? (
            <div className="h-1 w-56 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            HEVC fallback decoder
          </p>
        </div>
      ) : null}
    </div>
  );
}
