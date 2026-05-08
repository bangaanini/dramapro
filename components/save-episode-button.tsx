"use client";

import { useState } from "react";
import { Bookmark, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { triggerImpactHaptic, triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type SaveEpisodeButtonProps = {
  dramaId: string;
  episodeIndex: number;
  isSignedIn: boolean;
  initialSaved?: boolean;
  redirectTo: string;
  className?: string;
};

export function SaveEpisodeButton({
  dramaId,
  episodeIndex,
  isSignedIn,
  initialSaved = false,
  redirectTo,
  className,
}: SaveEpisodeButtonProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    if (isPending) {
      return;
    }

    if (!isSignedIn) {
      triggerImpactHaptic("light");
      router.push(`/sign-in?next=${encodeURIComponent(redirectTo)}`);
      return;
    }

    setIsPending(true);
    triggerSelectionHaptic();

    try {
      const response = await fetch("/api/me/saved-episodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          dramaId,
          episodeIndex,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { isSaved?: boolean; error?: string }
        | null;

      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/sign-in?next=${encodeURIComponent(redirectTo)}`);
          return;
        }

        throw new Error(payload?.error || "Gagal menyimpan episode.");
      }

      setIsSaved(Boolean(payload?.isSaved));
      router.refresh();
    } catch {
      // Feedback lengkap sudah ada di player; detail cukup menjaga tombol tetap stabil.
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      aria-pressed={isSaved}
      aria-label={
        isSaved
          ? `Hapus episode ${episodeIndex} dari tersimpan`
          : `Simpan episode ${episodeIndex}`
      }
      onClick={() => {
        void handleClick();
      }}
      className={cn(
        buttonVariants({ variant: "secondary", size: "lg" }),
        "h-12 w-12 rounded-xl border-white/12 bg-white/[0.045] px-0 text-white/84 hover:border-white/22 hover:bg-white/9 sm:h-14 sm:w-14",
        isSaved && "border-accent/45 bg-accent-soft text-white",
        className,
      )}
    >
      {isPending ? (
        <LoaderCircle className="size-5 animate-spin" />
      ) : (
        <Bookmark className={cn("size-5", isSaved && "fill-current")} />
      )}
    </button>
  );
}
