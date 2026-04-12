"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

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
        "relative overflow-hidden rounded-[1.45rem] border px-3 py-4 text-center text-sm font-semibold transition active:scale-[0.97]",
        locked
          ? "border-amber-500/35 bg-amber-500/9 text-amber-300 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.06)] hover:border-amber-400/45 hover:bg-amber-500/12"
          : isResume
            ? "border-accent/40 bg-accent text-white shadow-[0_14px_30px_rgba(255,122,69,0.28)]"
            : "border-white/8 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white",
      )}
    >
      {locked ? (
        <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-black shadow-[0_8px_18px_rgba(245,158,11,0.35)]">
          <Lock className="size-2.75" strokeWidth={2.8} />
        </span>
      ) : (
        <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500/90 shadow-[0_0_0_2px_rgba(6,10,10,0.65)]" />
      )}
      <span className="block text-base tracking-tight">
        {episode.toString().padStart(2, "0")}
      </span>
      {locked ? (
        <span className="mt-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-amber-200/80">
          Buka VIP
        </span>
      ) : null}
    </Link>
  );
}
