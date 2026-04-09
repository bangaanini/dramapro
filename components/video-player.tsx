"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import { AlertCircle, LoaderCircle, MonitorPlay, Play, Subtitles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StreamQuality = {
  label: string;
  url: string;
  mimeType: "application/x-mpegURL" | "video/mp4";
};

type StreamSubtitle = {
  label: string;
  language: string;
  url: string;
};

type StreamState = {
  dramaId: string;
  provider: string;
  episodeIndex: number;
  defaultQuality: string | null;
  qualities: StreamQuality[];
  subtitles: StreamSubtitle[];
};

type VideoPlayerProps = {
  internalDramaId: string;
  title: string;
  episodeCount: number;
};

export function VideoPlayer({
  internalDramaId,
  title,
  episodeCount,
}: VideoPlayerProps) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoElementRef.current || playerRef.current) {
      return;
    }

    playerRef.current = videojs(videoElementRef.current, {
      autoplay: false,
      controls: true,
      fluid: true,
      preload: "auto",
      responsive: true,
      playsinline: true,
    });

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStream() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/stream?internalDramaId=${encodeURIComponent(internalDramaId)}&episodeIndex=${selectedEpisode}`,
          {
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as StreamState | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Failed to load stream.",
          );
        }

        const nextStream = payload as StreamState;
        setStream(nextStream);
        setSelectedQuality(nextStream.defaultQuality);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setStream(null);
        setSelectedQuality(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load stream.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadStream();

    return () => controller.abort();
  }, [internalDramaId, selectedEpisode]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !stream) {
      return;
    }

    const selectedSource =
      stream.qualities.find((quality) => quality.label === selectedQuality) ??
      stream.qualities[0];

    if (!selectedSource) {
      return;
    }

    const currentTime = player.currentTime() ?? 0;
    const shouldResume = !player.paused();

    player.src({
      src: selectedSource.url,
      type: selectedSource.mimeType,
    });

    player.ready(() => {
      if (stream.subtitles.length) {
        const existingTracks = player.remoteTextTracks();
        const trackList = existingTracks as unknown as ArrayLike<TextTrack>;
        const tracks = Array.from(
          { length: existingTracks.length },
          (_, index) => trackList[index],
        ).filter((track): track is TextTrack => Boolean(track));

        for (const track of tracks) {
          player.removeRemoteTextTrack(track);
        }

        for (const subtitle of stream.subtitles) {
          player.addRemoteTextTrack(
            {
              src: subtitle.url,
              kind: "subtitles",
              srclang: subtitle.language || "und",
              label: subtitle.label,
            },
            false,
          );
        }
      }

      player.one("loadedmetadata", () => {
        if (currentTime > 0) {
          player.currentTime(currentTime);
        }

        if (shouldResume) {
          const playAttempt = player.play();

          if (playAttempt && typeof playAttempt.catch === "function") {
            void playAttempt.catch(() => undefined);
          }
        }
      });
    });
  }, [selectedQuality, stream]);

  const qualityOptions = stream?.qualities ?? [];

  return (
    <div className="space-y-5">
      <div className="aspect-video overflow-hidden rounded-[1.35rem] border border-white/8 bg-black/45">
        <video
          ref={videoElementRef}
          className="video-js vjs-big-play-centered"
          aria-label={title}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-white/8 bg-black/18">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                  Now watching
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {title}
                </h2>
              </div>
              <Badge variant="secondary">Episode {selectedEpisode}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedEpisode((episode) => Math.max(1, episode - 1))}
                disabled={selectedEpisode === 1 || isLoading}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSelectedEpisode((episode) =>
                    Math.min(episodeCount, episode + 1),
                  )
                }
                disabled={selectedEpisode === episodeCount || isLoading}
              >
                Next
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-[var(--muted)]">
                <Play className="size-3.5 text-accent" />
                {episodeCount} episodes
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
                <LoaderCircle className="size-4 animate-spin text-accent" />
                Resolving provider stream...
              </div>
            ) : null}

            {error ? (
              <div className="flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                <AlertCircle className="size-4" />
                {error}
              </div>
            ) : null}

            {!isLoading && !error && !stream?.qualities.length ? (
              <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--muted)]">
                No playable sources were returned for this episode.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-black/18">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <MonitorPlay className="size-4 text-accent" />
              Quality
            </div>
            <div className="flex flex-wrap gap-2">
              {qualityOptions.map((quality) => (
                <button
                  key={quality.url}
                  type="button"
                  onClick={() => setSelectedQuality(quality.label)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    selectedQuality === quality.label
                      ? "border-accent bg-accent text-white"
                      : "border-white/10 bg-white/4 text-[var(--muted)] hover:border-white/20 hover:bg-white/8",
                  )}
                >
                  {quality.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Subtitles className="size-4 text-accent" />
                Subtitles
              </div>
              {stream?.subtitles.length ? (
                <div className="flex flex-wrap gap-2">
                  {stream.subtitles.map((subtitle) => (
                    <Badge key={subtitle.url} variant="outline">
                      {subtitle.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No subtitle tracks exposed by this provider.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/8 bg-black/18">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-white">Episode Picker</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Select any episode without leaving the page.
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: episodeCount }, (_, index) => index + 1).map(
                (episode) => (
                  <button
                    key={episode}
                    type="button"
                    onClick={() => setSelectedEpisode(episode)}
                    disabled={isLoading && selectedEpisode === episode}
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-sm font-medium transition",
                      selectedEpisode === episode
                        ? "border-accent bg-accent text-white"
                        : "border-white/10 bg-white/4 text-[var(--muted)] hover:border-white/20 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {episode}
                  </button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
