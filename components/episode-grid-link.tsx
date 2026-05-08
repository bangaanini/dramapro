"use client";

import Link from "next/link";
import { Crown } from "lucide-react";

import { triggerImpactHaptic, triggerSelectionHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type EpisodeGridLinkProps = {
  href: string;
  episode: number;
  locked?: boolean;
  isResume?: boolean;
};

export function EpisodeGridLink({
  href,
  episode,
  locked = false,
  isResume = false,
}: EpisodeGridLinkProps) {
  return (
    <Link
      href={href}
      onPointerDown={() => {
        if (locked) {
          triggerImpactHaptic("light");
          return;
        }

        triggerSelectionHaptic();
      }}
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden rounded-[0.9rem] border text-center text-xl font-semibold transition active:scale-[0.97] sm:rounded-[1.05rem] sm:text-2xl lg:rounded-lg lg:text-base",
        locked
          ? "border-amber-500/35 bg-white/[0.045] text-white/88 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)] hover:border-amber-400/45 hover:bg-white/8"
          : isResume
            ? "border-accent/45 bg-white/[0.055] text-white shadow-[inset_0_0_0_1px_rgba(255,122,69,0.22)]"
            : "border-white/10 bg-white/[0.045] text-white/84 hover:border-white/22 hover:bg-white/8 hover:text-white",
      )}
    >
      {locked ? (
        <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[#21110a] shadow-[0_8px_18px_rgba(245,158,11,0.35)] sm:right-1.5 sm:top-1.5">
          <Crown className="size-3" strokeWidth={2.6} />
        </span>
      ) : null}
      <span className="block tracking-tight">{episode}</span>
    </Link>
  );
}
