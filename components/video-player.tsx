"use client";

import {
  type PointerEvent,
  type ReactNode,
  type TouchEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListVideo,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

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
  providerName: string;
  episodeCount: number;
  watchValue: string;
  initialEpisode?: number;
  initialPositionSeconds?: number;
};

export function VideoPlayer({
  internalDramaId,
  title,
  providerName,
  episodeCount,
  watchValue,
  initialEpisode = 1,
  initialPositionSeconds = 0,
}: VideoPlayerProps) {
  const playerStageRef = useRef<HTMLDivElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const lastLoadedEpisodeRef = useRef<number | null>(null);
  const hideChromeTimeoutRef = useRef<number | null>(null);
  const singleTapTimeoutRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastTapRef = useRef<{
    time: number;
    zone: "left" | "center" | "right";
  } | null>(null);
  const hasAttemptedAutoFullscreenRef = useRef(false);
  const initialResumeRef = useRef({
    episodeIndex: initialEpisode,
    positionSeconds: initialPositionSeconds,
  });
  const lastHistorySnapshotRef = useRef<string | null>(null);

  const [selectedEpisode, setSelectedEpisode] = useState(
    Math.min(Math.max(1, initialEpisode), Math.max(episodeCount, 1)),
  );
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("off");
  const [stream, setStream] = useState<StreamState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isEpisodeSheetOpen, setIsEpisodeSheetOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekNotice, setSeekNotice] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!videoElementRef.current || playerRef.current) {
      return;
    }

    const player = videojs(videoElementRef.current, {
      autoplay: true,
      controls: false,
      fluid: false,
      loop: false,
      muted: true,
      preload: "auto",
      responsive: true,
      playsinline: true,
      userActions: {
        hotkeys: false,
      },
    });

    player.muted(true);
    player.on("play", () => setIsPlaying(true));
    player.on("pause", () => setIsPlaying(false));
    player.on("ended", () => {
      setIsPlaying(false);
      setSelectedEpisode((currentEpisode) =>
        currentEpisode < episodeCount
          ? Math.min(episodeCount, currentEpisode + 1)
          : currentEpisode,
      );
    });

    playerRef.current = player;

    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [episodeCount]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    player.muted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (!isEpisodeSheetOpen && !isFullscreen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isEpisodeSheetOpen, isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const stage = playerStageRef.current;
      const fullscreenElement = document.fullscreenElement;
      setIsFullscreen(Boolean(stage && fullscreenElement === stage));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!seekNotice && !shareNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSeekNotice(null);
      setShareNotice(null);
    }, 1600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [seekNotice, shareNotice]);

  useEffect(() => {
    if (hideChromeTimeoutRef.current) {
      window.clearTimeout(hideChromeTimeoutRef.current);
      hideChromeTimeoutRef.current = null;
    }

    if (!isPlaying || isEpisodeSheetOpen || !isChromeVisible) {
      return;
    }

    hideChromeTimeoutRef.current = window.setTimeout(() => {
      setIsChromeVisible(false);
    }, 2400);

    return () => {
      if (hideChromeTimeoutRef.current) {
        window.clearTimeout(hideChromeTimeoutRef.current);
        hideChromeTimeoutRef.current = null;
      }
    };
  }, [isChromeVisible, isEpisodeSheetOpen, isPlaying]);

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
        setSelectedSubtitle(getPreferredSubtitleLabel(nextStream.subtitles));
        setIsChromeVisible(true);
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

    const shouldResumeInitialPosition =
      lastLoadedEpisodeRef.current !== stream.episodeIndex &&
      initialResumeRef.current.episodeIndex === stream.episodeIndex &&
      initialResumeRef.current.positionSeconds > 0;

    const currentTime =
      lastLoadedEpisodeRef.current === stream.episodeIndex
        ? player.currentTime() ?? 0
        : shouldResumeInitialPosition
          ? initialResumeRef.current.positionSeconds
          : 0;

    lastLoadedEpisodeRef.current = stream.episodeIndex;
    if (shouldResumeInitialPosition) {
      initialResumeRef.current = {
        episodeIndex: -1,
        positionSeconds: 0,
      };
    }

    player.src({
      src: selectedSource.url,
      type: selectedSource.mimeType,
    });

    player.ready(() => {
      const existingTracks = player.remoteTextTracks();
      const trackArrayLike = existingTracks as unknown as ArrayLike<TextTrack>;
      const tracks = Array.from(
        { length: existingTracks.length },
        (_, index) => trackArrayLike[index],
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
            default: subtitle.label === selectedSubtitle,
          },
          false,
        );
      }

      player.one("loadedmetadata", () => {
        if (currentTime > 0) {
          player.currentTime(currentTime);
        }

        player.muted(isMuted);
        applySubtitleSelection(player, selectedSubtitle);

        const playAttempt = player.play();

        if (playAttempt && typeof playAttempt.catch === "function") {
          void playAttempt.catch(() => undefined);
        }

        void requestBestEffortFullscreen();
      });
    });
  }, [isMuted, selectedQuality, selectedSubtitle, stream]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !stream) {
      return;
    }

    applySubtitleSelection(player, selectedSubtitle);
  }, [selectedSubtitle, stream]);

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) {
        window.clearTimeout(singleTapTimeoutRef.current);
      }
    };
  }, []);

  const qualityOptions = stream?.qualities ?? [];
  const subtitleOptions = stream?.subtitles ?? [];
  const episodeNumbers = Array.from(
    { length: Math.max(episodeCount, 0) },
    (_, index) => index + 1,
  );

  function togglePlayback() {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    setIsChromeVisible(true);

    if (player.paused()) {
      const playAttempt = player.play();

      if (playAttempt && typeof playAttempt.catch === "function") {
        void playAttempt.catch(() => undefined);
      }
      return;
    }

    player.pause();
  }

  const persistWatchHistory = useEffectEvent(
    async (positionSecondsOverride?: number) => {
      const player = playerRef.current;

      if (!player || !internalDramaId) {
        return;
      }

      const resolvedPosition =
        typeof positionSecondsOverride === "number"
          ? positionSecondsOverride
          : Math.max(0, Math.floor(player.currentTime() ?? 0));

      if (resolvedPosition < 3) {
        return;
      }

      const snapshot = `${selectedEpisode}:${resolvedPosition}`;

      if (lastHistorySnapshotRef.current === snapshot) {
        return;
      }

      lastHistorySnapshotRef.current = snapshot;

      try {
        await fetch("/api/watch-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          keepalive: true,
          body: JSON.stringify({
            internalDramaId,
            episodeIndex: selectedEpisode,
            lastPositionSeconds: resolvedPosition,
          }),
        });
      } catch {
        // Ignore write failures for anonymous users or transient network issues.
      }
    },
  );

  function seekBy(seconds: number) {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    const currentTime = player.currentTime() ?? 0;
    const duration = player.duration() ?? Number.NaN;
    const nextTime = currentTime + seconds;
    const resolvedTime = Number.isFinite(duration)
      ? Math.min(Math.max(0, nextTime), duration)
      : Math.max(0, nextTime);

    player.currentTime(resolvedTime);
    setIsChromeVisible(true);
    setSeekNotice(seconds > 0 ? `+${seconds} detik` : `${seconds} detik`);
  }

  async function requestBestEffortFullscreen() {
    if (hasAttemptedAutoFullscreenRef.current) {
      return;
    }

    hasAttemptedAutoFullscreenRef.current = true;

    if (typeof window === "undefined" || window.innerWidth >= 1024) {
      return;
    }

    const stage = playerStageRef.current;
    const videoElement = videoElementRef.current as
      | (HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        })
      | null;

    try {
      if (stage?.requestFullscreen) {
        await stage.requestFullscreen();
        return;
      }
    } catch {
      // Browser blocked fullscreen without a user gesture.
    }

    try {
      videoElement?.webkitEnterFullscreen?.();
    } catch {
      // iOS Safari may still reject this outside a user interaction.
    }
  }

  async function toggleFullscreen() {
    const stage = playerStageRef.current;
    const videoElement = videoElementRef.current as
      | (HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        })
      | null;

    setIsChromeVisible(true);

    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }

    try {
      if (stage?.requestFullscreen) {
        await stage.requestFullscreen();
        return;
      }
    } catch {
      // Fall through to platform-specific video fullscreen.
    }

    try {
      videoElement?.webkitEnterFullscreen?.();
    } catch {
      setShareNotice("Browser ini menolak fullscreen otomatis.");
    }
  }

  function changeEpisode(nextEpisode: number) {
    setSelectedEpisode((currentEpisode) => {
      const resolvedEpisode = Math.min(
        Math.max(1, nextEpisode),
        Math.max(episodeCount, 1),
      );

      return resolvedEpisode === currentEpisode ? currentEpisode : resolvedEpisode;
    });
  }

  function handleSurfaceTap() {
    setIsChromeVisible((current) => !current);
  }

  function resolveTapZone(clientX: number) {
    const shell = playerStageRef.current;

    if (!shell) {
      return "center" as const;
    }

    const rect = shell.getBoundingClientRect();
    const relativeX = clientX - rect.left;

    if (relativeX < rect.width * 0.34) {
      return "left" as const;
    }

    if (relativeX > rect.width * 0.66) {
      return "right" as const;
    }

    return "center" as const;
  }

  function handleSurfacePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const zone = resolveTapZone(event.clientX);
    const now = Date.now();
    const previousTap = lastTapRef.current;

    if (
      zone !== "center" &&
      previousTap &&
      previousTap.zone === zone &&
      now - previousTap.time < 280
    ) {
      if (singleTapTimeoutRef.current) {
        window.clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      lastTapRef.current = null;
      seekBy(zone === "left" ? -10 : 10);
      return;
    }

    if (zone === "center") {
      if (singleTapTimeoutRef.current) {
        window.clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      lastTapRef.current = null;
      handleSurfaceTap();
      return;
    }

    lastTapRef.current = { time: now, zone };

    if (singleTapTimeoutRef.current) {
      window.clearTimeout(singleTapTimeoutRef.current);
    }

    singleTapTimeoutRef.current = window.setTimeout(() => {
      handleSurfaceTap();
      lastTapRef.current = null;
      singleTapTimeoutRef.current = null;
    }, 220);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const touchStartY = touchStartYRef.current;
    const touchEndY = event.changedTouches[0]?.clientY ?? null;
    touchStartYRef.current = null;

    if (touchStartY === null || touchEndY === null) {
      return;
    }

    const deltaY = touchStartY - touchEndY;

    if (Math.abs(deltaY) < 56) {
      return;
    }

    setIsChromeVisible(true);

    if (deltaY > 0) {
      changeEpisode(selectedEpisode + 1);
      return;
    }

    changeEpisode(selectedEpisode - 1);
  }

  function scrollToSynopsis() {
    document.getElementById("watch-synopsis")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleShare() {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Tonton ${title} di DramaPro`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareNotice("Link drama berhasil disalin.");
    } catch {
      setShareNotice("Gagal membagikan link. Coba lagi.");
    }
  }

  function renderEpisodeButtons(onPickEpisode?: () => void) {
    return episodeNumbers.map((episode) => (
      <button
        key={episode}
        type="button"
        onClick={() => {
          setSelectedEpisode(episode);
          onPickEpisode?.();
        }}
        className={cn(
          "rounded-2xl border px-3 py-3 text-sm font-semibold transition",
          selectedEpisode === episode
            ? "border-accent/40 bg-accent text-white shadow-[0_14px_30px_rgba(255,122,69,0.28)]"
            : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:bg-white/8 hover:text-white",
        )}
      >
        EP.{episode}
      </button>
    ));
  }

  useEffect(() => {
    const player = playerRef.current;

    if (!player || isLoading || error) {
      return;
    }

    const interval = window.setInterval(() => {
      void persistWatchHistory();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [error, internalDramaId, isLoading, selectedEpisode]);

  useEffect(() => {
    const handlePageHide = () => {
      void persistWatchHistory();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [selectedEpisode]);

  useEffect(() => {
    return () => {
      void persistWatchHistory();
    };
  }, [selectedEpisode]);

  return (
    <div className="space-y-5">
      <div
        ref={playerStageRef}
        className={cn(
          "relative mx-auto w-full max-w-[440px]",
          isFullscreen && "drama-stage-fullscreen",
        )}
      >
        <div className="drama-player-shell overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
          <div
            className="relative aspect-[9/16] bg-black"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <video
              ref={videoElementRef}
              className="video-js drama-player"
              aria-label={title}
            />

            <button
              type="button"
              onPointerUp={handleSurfacePointerUp}
              className="absolute inset-0 z-10 cursor-pointer"
              aria-label="Toggle player controls"
            />

            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 z-20 h-32 bg-gradient-to-b from-black/75 via-black/25 to-transparent transition duration-300",
                isChromeVisible ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition duration-300",
                isChromeVisible ? "opacity-100" : "opacity-0",
              )}
            />

            <div
              className={cn(
                "absolute left-4 top-4 z-30 flex max-w-[70%] flex-wrap gap-2 transition duration-300",
                isChromeVisible
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-2 opacity-0",
              )}
            >
              <Badge className="border-white/12 bg-black/45 text-white backdrop-blur">
                {providerName}
              </Badge>
              <Badge className="border-accent/20 bg-accent-soft text-white backdrop-blur">
                Episode {selectedEpisode}
              </Badge>
            </div>

            <div
              className={cn(
                "absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3 transition duration-300",
                isChromeVisible
                  ? "translate-x-0 opacity-100"
                  : "translate-x-4 opacity-0",
              )}
            >
              <PlayerAction
                label="Info"
                onClick={scrollToSynopsis}
                icon={<FileText className="size-4" />}
              />
              <PlayerAction
                label="Episode"
                onClick={() => {
                  setIsChromeVisible(true);
                  setIsEpisodeSheetOpen(true);
                }}
                icon={<ListVideo className="size-4" />}
              />
              <PlayerAction
                label={isFullscreen ? "Keluar" : "Fullscreen"}
                onClick={() => {
                  void toggleFullscreen();
                }}
                icon={
                  isFullscreen ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )
                }
              />
              <PlayerAction
                label="Bagikan"
                onClick={handleShare}
                icon={<Share2 className="size-4" />}
              />
            </div>

            <div
              className={cn(
                "absolute inset-x-0 bottom-0 z-30 space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition duration-300",
                isChromeVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-full border border-white/12 bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur">
                  Autoplay aktif
                </div>
                <button
                  type="button"
                  onClick={() => setIsMuted((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/45 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-black/60"
                >
                  {isMuted ? (
                    <VolumeX className="size-3.5" />
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                  {isMuted ? "Unmute" : "Sound on"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-[1.4rem] border border-white/10 bg-black/40 px-3 py-3 backdrop-blur">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => seekBy(-10)}
                  disabled={isLoading}
                  className="h-11 min-w-11 rounded-full px-3"
                >
                  <RotateCcw className="size-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => changeEpisode(selectedEpisode - 1)}
                  disabled={selectedEpisode === 1 || isLoading}
                  className="h-11 min-w-11 rounded-full px-3"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_16px_40px_rgba(255,122,69,0.35)] transition hover:bg-[var(--accent-strong)]"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="size-5 fill-current" />
                  )}
                </button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => seekBy(10)}
                  disabled={isLoading}
                  className="h-11 min-w-11 rounded-full px-3"
                >
                  <RotateCw className="size-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => changeEpisode(selectedEpisode + 1)}
                  disabled={selectedEpisode === episodeCount || isLoading}
                  className="h-11 min-w-11 rounded-full px-3"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/72">
                <span>Double tap kiri/kanan untuk seek</span>
                <span>Swipe untuk ganti episode</span>
              </div>
            </div>

            {isLoading ? (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/55 px-4 py-3 text-sm text-white">
                  <LoaderCircle className="size-4 animate-spin text-accent" />
                  Menyiapkan stream episode...
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="absolute inset-x-6 bottom-24 z-40 rounded-3xl border border-red-400/20 bg-red-500/12 px-4 py-4 text-sm text-red-100 backdrop-blur">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            {(seekNotice || shareNotice) ? (
              <div className="pointer-events-none absolute inset-x-0 top-6 z-40 flex justify-center px-4">
                <div className="rounded-full border border-white/10 bg-black/55 px-4 py-2 text-sm text-white backdrop-blur">
                  {seekNotice ?? shareNotice}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {isEpisodeSheetOpen ? (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setIsEpisodeSheetOpen(false)}
              className="absolute inset-0"
              aria-label="Close episode picker"
            />
            <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(46,33,43,0.96),rgba(22,16,20,0.98))] p-5 shadow-[0_-24px_60px_rgba(0,0,0,0.4)]">
              <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-white/25" />
              <div className="mx-auto w-full max-w-[460px] space-y-4">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold text-white">Pilih Episode</h3>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Episode akan diputar otomatis setelah dipilih.
                  </p>
                </div>
                <div className="grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto pr-1 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:grid-cols-5">
                  {renderEpisodeButtons(() => setIsEpisodeSheetOpen(false))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!isFullscreen ? (
        <div className="mx-auto w-full max-w-[440px] space-y-4">
          <Card className="glass-panel rounded-[1.8rem] border-white/10">
            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-accent/25 bg-accent-soft text-accent">
                    <Sparkles className="mr-1.5 size-3.5" />
                    Short drama mode
                  </Badge>
                  <Badge variant="secondary">{episodeCount} episode</Badge>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {title}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Episode saat ini: <span className="text-white">EP.{selectedEpisode}</span>
                  {watchValue ? (
                    <>
                      {" "}
                      • Popularity <span className="text-white">{watchValue}</span>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Playback
                  </p>
                  <p className="mt-2 font-medium text-white">
                    Vertikal, autoplay, lanjut otomatis
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Subtitle
                  </p>
                  <p className="mt-2 font-medium text-white">
                    {subtitleOptions.length > 0
                      ? `Otomatis ${selectedSubtitle === "off" ? "nonaktif" : selectedSubtitle}`
                      : "Belum ada subtitle tambahan"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Kualitas
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsChromeVisible(true);
                      setIsEpisodeSheetOpen(true);
                    }}
                    className="rounded-full"
                  >
                    <ListVideo className="mr-2 size-4" />
                    Pilih episode
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {qualityOptions.length > 0 ? (
                    qualityOptions.map((quality) => (
                      <button
                        key={`${quality.label}-${quality.url}`}
                        type="button"
                        onClick={() => setSelectedQuality(quality.label)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm font-medium transition",
                          selectedQuality === quality.label
                            ? "border-accent/35 bg-accent text-white"
                            : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:text-white",
                        )}
                      >
                        {quality.label}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--muted)]">
                      Kualitas akan muncul setelah stream siap.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel rounded-[1.8rem] border-white/10">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Daftar Episode</h3>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Pilih episode tanpa pindah halaman.
                  </p>
                </div>
                <Badge variant="secondary">EP.{selectedEpisode}</Badge>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {renderEpisodeButtons()}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function getPreferredSubtitleLabel(subtitles: StreamSubtitle[]) {
  if (subtitles.length === 0) {
    return "off";
  }

  const preferredSubtitle = subtitles.find((subtitle) =>
    matchesIndonesianSubtitle(subtitle),
  );

  return preferredSubtitle?.label ?? subtitles[0]?.label ?? "off";
}

function matchesIndonesianSubtitle(subtitle: StreamSubtitle) {
  const language = subtitle.language.toLowerCase();
  const label = subtitle.label.toLowerCase();

  return (
    language === "id" ||
    language === "id-id" ||
    language.includes("indo") ||
    language.includes("indones") ||
    label.includes("indo") ||
    label.includes("indones")
  );
}

function applySubtitleSelection(player: Player, selectedSubtitle: string) {
  const trackList = player.remoteTextTracks();
  const trackArrayLike = trackList as unknown as ArrayLike<TextTrack>;
  const tracks = Array.from(
    { length: trackList.length },
    (_, index) => trackArrayLike[index],
  ).filter((track): track is TextTrack => Boolean(track));

  for (const track of tracks) {
    track.mode =
      selectedSubtitle !== "off" && track.label === selectedSubtitle
        ? "showing"
        : "disabled";
  }
}

function PlayerAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-16 flex-col items-center gap-2 text-center text-xs text-white"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/45 backdrop-blur transition hover:bg-black/60">
        {icon}
      </span>
      <span className="text-[11px] leading-tight text-white/88">{label}</span>
    </button>
  );
}
